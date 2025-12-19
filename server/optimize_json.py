
import json
import os

file_path = r'C:\Users\Administrator\Desktop\web\public\locales\zh\translation.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        # Since the file might have duplicate keys, standard json.load might lose data or error depending on implementation.
        # However, in Python, json.load usually takes the last occurrence.
        # But I need to preserve the "middle" user_profile (gallery) and the "first" user_profile (partial).
        # So I should read it as a list of pairs or raw text.
        # But wait, if I use json.load, I lose the first two user_profile blocks if they have the exact same key!
        pass
except Exception as e:
    print(f"Error reading file: {e}")

# Strategy: Read line by line or use object_pairs_hook
def dict_raise_on_duplicates(ordered_pairs):
    d = {}
    for k, v in ordered_pairs:
        if k == 'user_profile':
            # Check for Gallery
            is_gallery = False
            if isinstance(v, dict) and 'title' in v and ('Light & Shadow Gallery' in v['title'] or '光影画廊' in v['title']):
                is_gallery = True
            
            # Check for Main (has 'roles' or 'security' field which partial might also have but 'roles' is unique to main in this file)
            # Partial has 'security' too.
            # Main has 'roles': {'admin':...}
            is_main = False
            if isinstance(v, dict) and 'roles' in v:
                is_main = True

            if is_gallery:
                d['gallery_page'] = v
            elif is_main:
                # Merge with existing if available
                if 'user_profile' in d:
                    partial = d['user_profile']
                    # Verify it's not the gallery (in case order was different)
                    # But we handled gallery separately.
                    # Merge
                    if isinstance(partial, dict):
                        for pk, pv in partial.items():
                            if pk not in v:
                                v[pk] = pv
                d['user_profile'] = v
            else:
                # Assume partial or first occurrence
                d['user_profile'] = v
        elif k in d:
            # Other duplicates?
            print(f"Warning: Duplicate key {k} found. Overwriting.")
            d[k] = v
        else:
            d[k] = v
    return d

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f, object_pairs_hook=dict_raise_on_duplicates)

# Verify merge
if 'user_profile' in data:
    up = data['user_profile']
    # Ensure gender_options is there
    if 'gender_options' not in up:
        # It might have been missed if partial was processed second (unlikely if sequential)
        # Actually, standard json parser processes in order.
        # 1. user_profile (partial) -> stores as user_profile_partial
        # 2. user_profile (gallery) -> stores as gallery_page
        # 3. user_profile (main) -> merges user_profile_partial
        pass

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Successfully optimized translation.json")
