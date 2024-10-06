import fs from "fs";
import path from "path";

const __dirname = path.resolve();

// Шлях до файлу signatures.txt
const signaturesFilePath = path.join(__dirname, "signatures.txt");

// Функція для видалення дублікатів по сигнатурі методу
function removeDuplicateSignatures() {
  // Зчитуємо вміст файлу signatures.txt
  const fileContent = fs.readFileSync(signaturesFilePath, "utf8");

  // Поділяємо вміст на рядки
  const lines = fileContent.split("\n");

  // Об'єкт для зберігання унікальних сигнатур
  const uniqueSignatures = new Set();
  const result = [];

  // Проходимо по кожному рядку
  lines.forEach((line) => {
    const match = line.match(/method signature: '([0x[a-fA-F0-9]+)'/);

    if (match) {
      const methodSignature = match[1];

      // Якщо сигнатура ще не зустрічалася, додаємо рядок у результат
      if (!uniqueSignatures.has(methodSignature)) {
        uniqueSignatures.add(methodSignature);
        result.push(line); // Зберігаємо рядок без дубліката
      }
    }
  });

  // Записуємо результат у файл signatures.txt, перезаписуючи його
  fs.writeFileSync(signaturesFilePath, result.join("\n") + "\n", "utf8");

  console.log("Дублікати успішно видалено.");
}

// Запуск функції
removeDuplicateSignatures();
