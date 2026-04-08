const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Нумерологія - розрахунки
app.post('/api/numerology/calculate', (req, res) => {
  const { birth_date, full_name } = req.body;
  
  const lifePathNumber = calculateLifePathNumber(birth_date);
  const destinyNumber = calculateDestinyNumber(full_name);
  
  res.json({
    success: true,
    data: {
      report: {
        life_path_number: lifePathNumber,
        destiny_number: destinyNumber,
        report_data: {
          life_path_interpretation: getLifePathMeaning(lifePathNumber),
          destiny_interpretation: getDestinyMeaning(destinyNumber),
          compatibility: "Гарна сумісність"
        }
      }
    }
  });
});

// Сумісність
app.post('/api/matchmaking/analyze', (req, res) => {
  res.json({
    success: true,
    analysis: {
      total_score: Math.floor(Math.random() * 20) + 15,
      details: {
        "Емоційна сумісність": "75%",
        "Інтелектуальна сумісність": "82%",
        "Духовна сумісність": "68%"
      }
    }
  });
});

// Функції розрахунків
function calculateLifePathNumber(birthDate) {
  const digits = birthDate.replace(/-/g, '');
  let sum = 0;
  for (let char of digits) sum += parseInt(char);
  while (sum > 9 && sum !== 11 && sum !== 22) {
    sum = sum.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
  }
  return sum;
}

function calculateDestinyNumber(name) {
  if (!name) return null;
  const map = { a:1, b:2, c:3, d:4, e:5, f:6, g:7, h:8, i:9, j:1, k:2, l:3, m:4, n:5, o:6, p:7, q:8, r:9, s:1, t:2, u:3, v:4, w:5, x:6, y:7, z:8 };
  let sum = 0;
  for (let char of name.toLowerCase()) {
    if (map[char]) sum += map[char];
  }
  while (sum > 9) sum = sum.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
  return sum;
}

function getLifePathMeaning(num) {
  const meanings = { 1: "Лідер", 2: "Дипломат", 3: "Творець", 4: "Практик", 5: "Мандрівник", 6: "Опікун", 7: "Мудрець", 8: "Амбітний", 9: "Гуманіст", 11: "Просвітлений", 22: "Майстер" };
  return meanings[num] || "Унікальний шлях";
}

function getDestinyMeaning(num) {
  const meanings = { 1: "Шлях лідера", 2: "Шлях миру", 3: "Шлях творчості", 4: "Шлях стабільності", 5: "Шлях свободи", 6: "Шлях служіння", 7: "Шлях знань", 8: "Шлях успіху", 9: "Шлях завершення" };
  return meanings[num] || "Унікальний шлях";
}

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));