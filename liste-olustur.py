#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GAÜN Fizik Mühendisliği – Dijital Deney ve Ders Arşivi
Otomatik Manifest (dersler/liste.json) Oluşturucu Betik

Kullanım:
  Yeni ders veya deney klasörü ekledikten sonra bu betiği çalıştırın:
  python liste-olustur.py
"""

import json
import os
import re
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DERSLER_DIR = os.path.join(BASE_DIR, "dersler")
OUTPUT_JSON = os.path.join(DERSLER_DIR, "liste.json")


def numeric_sort_key(name: str):
    match = re.match(r"^(\d+)", name)
    if match:
        return (0, int(match.group(1)), name.lower())
    return (1, 0, name.lower())


def is_safe_dir_name(name: str) -> bool:
    if name.startswith(".") or name.startswith("_"):
        return False
    return bool(re.match(r"^[a-zA-Z0-9._-]+$", name))


def build_manifest():
    if not os.path.isdir(DERSLER_DIR):
        raise FileNotFoundError(f"Dersler klasörü bulunamadı: {DERSLER_DIR}")

    dersler_list = []

    course_entries = sorted(os.listdir(DERSLER_DIR), key=numeric_sort_key)
    for course_name in course_entries:
        if not is_safe_dir_name(course_name):
            continue
        course_path = os.path.join(DERSLER_DIR, course_name)
        if not os.path.isdir(course_path):
            continue

        ders_txt_path = os.path.join(course_path, "ders.txt")
        if not os.path.isfile(ders_txt_path):
            continue

        experiments = []
        exp_entries = sorted(os.listdir(course_path), key=numeric_sort_key)
        for exp_name in exp_entries:
            if not is_safe_dir_name(exp_name):
                continue
            exp_path = os.path.join(course_path, exp_name)
            if not os.path.isdir(exp_path):
                continue

            deney_txt_path = os.path.join(exp_path, "deney.txt")
            if os.path.isfile(deney_txt_path):
                experiments.append({
                  "klasor": exp_name,
                  "foy": os.path.isfile(os.path.join(exp_path, "foy.pdf"))
                })

        dersler_list.append({
            "klasor": course_name,
            "deneyler": experiments
        })

    manifest = {
        "olusturulma_tarihi": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ders_sayisi": len(dersler_list),
        "dersler": dersler_list
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Başarılı: {OUTPUT_JSON} güncellendi ({len(dersler_list)} ders).")


if __name__ == "__main__":
    build_manifest()
