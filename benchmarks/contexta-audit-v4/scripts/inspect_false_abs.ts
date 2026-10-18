import { DATASET_100 } from './dataset_100.js';

const falseAbsIds = ['PV01', 'PV03', 'PV04', 'PV07', 'PV08', 'PV11', 'PV13', 'PV14', 'PV15', 'PV16', 'PV18', 'MP12', 'AM03', 'AM04', 'AM06', 'AM08', 'AM10'];
for (const id of falseAbsIds) {
  const item = DATASET_100.find(i => i.id === id)!;
  console.log(`[${id}] Q: "${item.question}"`);
  console.log(`      Keywords: [${item.supporting_keywords.join(', ')}]`);
  console.log(`      Expected Pages: [${item.expected_pages.join(', ')}]`);
}
