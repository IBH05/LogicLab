from pathlib import Path
import hashlib
import json
import zipfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
output = root / 'tmp' / 'auditoria'
output.mkdir(parents=True, exist_ok=True)
inventory = []
for source in sorted(root.iterdir()):
    if source.suffix not in {'.pdf', '.docx', '.tsx'}:
        continue
    category = 'codigo-original' if source.suffix == '.tsx' else 'documentos'
    backup = root / 'evidencia' / category / source.name
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == hashlib.sha256(backup.read_bytes()).hexdigest()
    inventory.append({'archivo': source.name, 'bytes': source.stat().st_size, 'sha256': digest, 'copia_identica': True})
    if source.suffix == '.pdf':
        reader = PdfReader(source)
        content = '\n\n'.join(f'PÁGINA {index + 1}\n{page.extract_text()}' for index, page in enumerate(reader.pages))
        content += '\nMETADATOS\n' + str(reader.metadata)
    elif source.suffix == '.docx':
        with zipfile.ZipFile(source) as archive:
            sections = []
            for name in archive.namelist():
                if name.startswith('word/media/'):
                    (output / Path(name).name).write_bytes(archive.read(name))
                if name.endswith('.xml') and (name.startswith('word/') or name.startswith('docProps/')):
                    tree = ET.fromstring(archive.read(name))
                    sections.append(name + '\n' + '\n'.join(element.text for element in tree.iter() if element.text and element.text.strip()))
            content = '\n\n'.join(sections)
    else:
        continue
    (output / f'{source.stem}.txt').write_text(content, encoding='utf-8')
(root / 'evidencia' / 'reportes' / 'inventario-originales.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Originales y copias idénticos:', len(inventory))
