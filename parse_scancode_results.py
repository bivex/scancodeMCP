#!/usr/bin/env python3
"""
ScanCode JSON Results Parser
This script parses ScanCode JSON output and identifies license issues and compliance problems.
"""

import json
import sys
import os
from collections import defaultdict, Counter
from datetime import datetime

class ScanCodeAnalyzer:
    GPL_2_0 = 'gpl-2.0'
    GPL_3_0 = 'gpl-3.0'
    AGPL_3_0 = 'agpl-3.0'
    GPL_2_0_PLUS = 'gpl-2.0-plus'
    GPL_3_0_PLUS = 'gpl-3.0-plus'
    LGPL_2_1 = 'lgpl-2.1'
    LGPL_3_0 = 'lgpl-3.0'
    CC_BY_SA_4_0 = 'cc-by-sa-4.0'

    def __init__(self, json_file):
        self.json_file = json_file
        self.data = None
        self.load_data()
        self.problematic_licenses = {
            'gpl': [self.GPL_2_0, self.GPL_3_0, self.GPL_2_0_PLUS, self.GPL_3_0_PLUS],
            'agpl': [self.AGPL_3_0, self.GPL_3_0_PLUS],
            'copyleft': [self.GPL_2_0, self.GPL_3_0, self.LGPL_2_1, self.LGPL_3_0, self.AGPL_3_0],
            'commercial_unfriendly': [self.GPL_2_0, self.GPL_3_0, self.AGPL_3_0, self.CC_BY_SA_4_0],
            'unknown': ['unknown', 'other-permissive', 'other-copyleft', 'unknown-license-reference']
        }
        self.permissive_licenses = [
            'mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 
            'cc0-1.0', 'unlicense', 'wtfpl', 'boost-1.0'
        ]

    def load_data(self):
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            print(f"✅ Successfully loaded {self.json_file}")
        except FileNotFoundError:
            print(f"❌ Error: File {self.json_file} not found")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON: {e}")
            sys.exit(1)

    def extract_licenses_from_file(self, file_info):
        """
        Собирает все лицензии из файла: detected_license_expression, license_detections, licenses.
        Возвращает список словарей: {'key': ..., 'name': ..., 'score': ...}
        """
        results = []
        # detected_license_expression (строка)
        expr = file_info.get('detected_license_expression')
        if expr and expr != '':
            results.append({'key': expr, 'name': expr, 'score': 100})
        # license_detections (список)
        for lic in file_info.get('license_detections', []):
            key = lic.get('license_expression') or lic.get('license_expression_spdx') or 'unknown'
            score = 100
            # Если есть matches, берем максимальный score
            if lic.get('matches'):
                score = max([m.get('score', 100) for m in lic['matches']])
            results.append({'key': key, 'name': key, 'score': score})
        # licenses (список, старый стиль)
        for lic in file_info.get('licenses', []):
            key = lic.get('key', 'unknown')
            name = lic.get('name', key)
            score = lic.get('score', 100)
            results.append({'key': key, 'name': name, 'score': score})
        return results

    def get_files_with_issues(self):
        issues = []
        if not self.data or 'files' not in self.data:
            print("❌ No 'files' section found in JSON")
            return issues
        for file_info in self.data['files']:
            file_path = file_info.get('path', 'Unknown')
            # Check for scan errors
            if file_info.get('scan_errors'):
                issues.append({
                    'file': file_path,
                    'type': 'scan_error',
                    'details': file_info['scan_errors']
                })
            # Check for license detection issues (низкий score)
            for lic in self.extract_licenses_from_file(file_info):
                if lic.get('score', 100) < 50:
                    issues.append({
                        'file': file_path,
                        'type': 'low_confidence_license',
                        'details': f"License: {lic.get('key', 'unknown')}, Score: {lic.get('score', 0)}"
                    })
        return issues

    def analyze_licenses(self):
        license_stats = defaultdict(list)
        all_licenses = Counter()
        if not self.data or 'files' not in self.data:
            return license_stats, all_licenses
        for file_info in self.data['files']:
            file_path = file_info.get('path', 'Unknown')
            for lic in self.extract_licenses_from_file(file_info):
                self._process_license_detection(lic, file_path, license_stats, all_licenses)
        return license_stats, all_licenses

    def _process_license_detection(self, lic_info, file_path, license_stats, all_licenses):
        key = lic_info.get('key', 'unknown')
        name = lic_info.get('name', key)
        score = lic_info.get('score', 100)
        all_licenses[key] += 1
        license_stats[key].append({
            'file': file_path,
            'name': name,
            'score': score
        })

    def identify_problematic_licenses(self, license_stats):
        problems = {
            'copyleft': [],
            'gpl': [],
            'agpl': [],
            'commercial_unfriendly': [],
            'unknown': [],
            'low_confidence': []
        }

        # Use sets to avoid duplicates if a file matches multiple criteria
        problem_sets = {key: set() for key in problems.keys()}

        for license_key, file_detections in license_stats.items():
            for detection_info in file_detections: # detection_info is {'file': ..., 'name': ..., 'score': ...}
                file_path = detection_info['file']
                score = detection_info['score']
                
                self._add_to_problem_sets(problem_sets, license_key, file_path, score)

        return self._convert_problem_sets_to_list(problem_sets)

    def _add_to_problem_sets(self, problem_sets, license_key, file_path, score):
        # Check for problematic license types
        for category, license_list in self.problematic_licenses.items():
            if any(problem_license in license_key.lower() for problem_license in license_list):
                problem_sets[category].add((file_path, license_key, score)) # Store as tuple for uniqueness

        # Check for low confidence scores (regardless of license type)
        if score < 70:
            problem_sets['low_confidence'].add((file_path, license_key, score))

    def _convert_problem_sets_to_list(self, problem_sets):
        problems = {
            'copyleft': [],
            'gpl': [],
            'agpl': [],
            'commercial_unfriendly': [],
            'unknown': [],
            'low_confidence': []
        }
        for category, item_set in problem_sets.items():
            for file_path, license_key, score in item_set:
                problems[category].append({
                    'file': file_path,
                    'name': license_key, # Use key for simplicity, name is often the same
                    'score': score
                })
        return problems

    def _print_report_header(self):
        print("=" * 80)
        print("🔍 SCANCODE LICENSE ANALYSIS REPORT")
        print("=" * 80)
        print(f"📁 Analyzed file: {self.json_file}")
        print("📅 Generated on: {}".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        print()

    def _print_basic_statistics(self, issues):
        total_files = len(self.data.get('files', []) if self.data else [])
        print("📊 BASIC STATISTICS")
        print(f"   Total files scanned: {total_files}")
        if issues:
            print(f"   Files with scan errors: {len([i for i in issues if i['type'] == 'scan_error'])}")
            print(f"   Files with low confidence licenses: {len([i for i in issues if i['type'] == 'low_confidence_license'])}")
        print()

    def _print_license_summary(self, all_licenses):
        print("📋 LICENSE SUMMARY")
        print(f"   Unique licenses detected: {len(all_licenses)}")
        print(f"   Total license detections: {sum(all_licenses.values())}")
        print()
        print("🏆 TOP 10 MOST COMMON LICENSES")
        for license_key, count in all_licenses.most_common(10):
            print(f"   {license_key:30} : {count:4} files")
        print()

    def _print_potential_issues(self, problems):
        print("⚠️  POTENTIAL LICENSE ISSUES")
        print("-" * 40)
        total_issues = sum(len(v) for v in problems.values())
        if total_issues == 0:
            print("   ✅ No major license issues detected!")
        else:
            for category, issue_list in problems.items():
                if issue_list:
                    print(f"\n   🚨 {category.upper().replace('_', ' ')} LICENSES ({len(issue_list)} files):")
                    for issue in issue_list[:5]:
                        print(f"      - {issue['file']}")
                        print(f"        License: {issue.get('name', 'Unknown')} (Score: {issue.get('score', 0)})")
                    if len(issue_list) > 5:
                        print(f"      ... and {len(issue_list) - 5} more files")
        print()

    def _print_scan_errors(self, issues):
        scan_errors = [i for i in issues if i['type'] == 'scan_error']
        if scan_errors:
            print("❌ FILES WITH SCAN ERRORS")
            print("-" * 40)
            for error in scan_errors[:10]:
                print(f"   {error['file']}")
                print(f"   Error: {error['details']}")
                print()

    def _print_recommendations(self, problems):
        print("💡 RECOMMENDATIONS")
        print("-" * 40)
        gpl_files = len(problems['gpl'])
        agpl_files = len(problems['agpl'])
        unknown_files = len(problems['unknown'])
        if gpl_files > 0:
            print(f"   🔴 {gpl_files} files with GPL licenses detected")
            print("      - Review if GPL compatibility is acceptable for your project")
            print("      - Consider alternative implementations for critical files")
        if agpl_files > 0:
            print(f"   🔴 {agpl_files} files with AGPL licenses detected")
            print("      - AGPL has network copyleft requirements")
            print("      - Avoid AGPL code in web services/SaaS applications")
        if unknown_files > 0:
            print(f"   🟡 {unknown_files} files with unknown/unclear licenses")
            print("      - Manual review required for these files")
            print("      - Contact original authors for clarification")
        low_confidence = len(problems['low_confidence'])
        if low_confidence > 0:
            print(f"   🟡 {low_confidence} files with low confidence license detection")
            print("      - Manual verification recommended")
            print("      - Check original source for accurate license information")
        print("\n" + "=" * 80)

    def generate_report(self):
        self._print_report_header()

        issues = self.get_files_with_issues()
        self._print_basic_statistics(issues)

        license_stats, all_licenses = self.analyze_licenses()
        self._print_license_summary(all_licenses)

        problems = self.identify_problematic_licenses(license_stats)
        self._print_potential_issues(problems)
        self._print_scan_errors(issues)
        self._print_recommendations(problems)

    def export_detailed_report(self, output_file='license_analysis_detailed.json'):
        license_stats, all_licenses = self.analyze_licenses()
        problems = self.identify_problematic_licenses(license_stats)
        issues = self.get_files_with_issues()
        detailed_report = {
            'metadata': {
                'source_file': self.json_file,
                'analysis_date': datetime.now().isoformat(),
                'total_files': len(self.data.get('files', []) if self.data else []),
                'total_licenses': len(all_licenses),
                'total_license_detections': sum(all_licenses.values())
            },
            'license_statistics': dict(all_licenses),
            'problematic_licenses': problems,
            'scan_issues': issues,
            'recommendations': self.generate_recommendations(problems)
        }
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(detailed_report, f, indent=2, ensure_ascii=False)
        print("📄 Detailed report exported to: {}".format(output_file))

    def generate_recommendations(self, problems):
        recommendations = []
        if problems['gpl']:
            recommendations.append({
                'severity': 'high',
                'category': 'gpl',
                'message': 'GPL licenses detected. Review compatibility with your project license.',
                'affected_files': len(problems['gpl'])
            })
        if problems['agpl']:
            recommendations.append({
                'severity': 'critical',
                'category': 'agpl',
                'message': 'AGPL licenses detected. Network copyleft requirements apply.',
                'affected_files': len(problems['agpl'])
            })
        if problems['unknown']:
            recommendations.append({
                'severity': 'medium',
                'category': 'unknown',
                'message': 'Unknown licenses detected. Manual review required.',
                'affected_files': len(problems['unknown'])
            })
        return recommendations

def main():
    if len(sys.argv) != 2:
        print("Usage: python parse_scancode_results.py <scancode_results.json>")
        print("\nExample:")
        print("python parse_scancode_results.py hwid_go_server_analysis.json")
        sys.exit(1)
    json_file = sys.argv[1]
    if not os.path.exists(json_file):
        print(f"❌ Error: File {json_file} does not exist")
        sys.exit(1)
    analyzer = ScanCodeAnalyzer(json_file)
    analyzer.generate_report()
    analyzer.export_detailed_report()

if __name__ == "__main__":
    main() 
