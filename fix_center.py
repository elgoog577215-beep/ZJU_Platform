import os
import re

files = [
    r'c:\Users\Administrator\Desktop\拓途浙享\ZJU_Platform\src\components\Events.jsx',
    r'c:\Users\Administrator\Desktop\拓途浙享\ZJU_Platform\src\components\Articles.jsx',
    r'c:\Users\Administrator\Desktop\拓途浙享\ZJU_Platform\src\components\Videos.jsx',
    r'c:\Users\Administrator\Desktop\拓途浙享\ZJU_Platform\src\components\Music.jsx',
    r'c:\Users\Administrator\Desktop\拓途浙享\ZJU_Platform\src\components\Gallery.jsx',
]

pattern = re.compile(r'fixed left-[45] right-[45] top-1/2 -translate-y-1/2')
replacement = r'fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit'

for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = pattern.sub(replacement, content)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated {f}")
    else:
        print(f"No changes in {f}")
