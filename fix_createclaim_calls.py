#!/usr/bin/env python3
"""
Fix all createClaim calls to include the 4th parameter (skillIndex)
"""
import re
import os

def fix_createclaim_in_file(filepath):
    """Fix createClaim calls in a single file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match createClaim calls with 3 string arguments but no 4th numeric argument
    # This regex looks for createClaim(...) where the closing paren is NOT preceded by ", 0" or similar
    pattern = r'createClaim\(([^)]+)"([^"]*)"(\s*)\)(?!\s*,\s*\d+)'
    
    # Replace with adding ", 0" before the closing paren
    def replacer(match):
        full_match = match.group(0)
        # Check if it already has 4 parameters by counting commas
        comma_count = full_match.count(',')
        if comma_count == 2:  # Only 3 parameters (2 commas)
            # Add ", 0" before the closing paren
            return full_match[:-1] + ', 0)'
        return full_match
    
    content = re.sub(pattern, replacer, content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {filepath}")
        return True
    else:
        print(f"  No changes needed in {filepath}")
        return False

def main():
    test_files = [
        'contracts/test/SkillClaim.t.sol',
        'contracts/test/DoS.t.sol',
        'contracts/test/Integration.t.sol',
        'contracts/test/Performance.t.sol',
        'contracts/test/LargeDataset.t.sol',
        'contracts/test/SkillClaim.pagination.t.sol',
    ]
    
    fixed_count = 0
    for filepath in test_files:
        if os.path.exists(filepath):
            if fix_createclaim_in_file(filepath):
                fixed_count += 1
        else:
            print(f"⚠ File not found: {filepath}")
    
    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
