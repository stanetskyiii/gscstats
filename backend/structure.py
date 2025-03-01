import os

# Путь к проекту
project_path = r"C:\Users\Андрей\Desktop\GSCSTATS"
output_file = "project_structure.txt"

# Исключаемые папки
exclude_dirs = {'__pycache__', 'venv', '.git'}

def generate_structure(root_path):
    structure = []

    for root, dirs, files in os.walk(root_path):
        # Исключаем ненужные папки
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        # Формируем относительный путь
        level = root.replace(root_path, "").count(os.sep)
        indent = " " * (level * 4)
        structure.append(f"{indent}📂 {os.path.basename(root)}/")

        # Обрабатываем файлы
        for file in sorted(files):
            if file.endswith((".py", ".txt")):  # Только Python и текстовые файлы
                file_path = os.path.join(root, file)
                structure.append(f"{indent}  ├── {file}")

                # Читаем содержимое файла
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                structure.append(f"\n{indent}  ─── Код файла {file} ───\n{content}\n")
                structure.append("-" * 50 + "\n")

    return "\n".join(structure)

# Генерируем структуру
project_structure = generate_structure(project_path)

# Сохраняем в файл
with open(output_file, "w", encoding="utf-8") as f:
    f.write(project_structure)

print(f"✅ Структура проекта сохранена в {output_file}")
