const fs = require('fs');
let content = fs.readFileSync('public/product.html', 'utf8');
const searchStr = `<h4 style="margin: 0 0 10px; font-size: 0.95rem; color: #374151;">Edit Product Details</h4>`;
const endStr = `          <p id="editMessage"`;
const startIdx = content.indexOf(searchStr);
const endIdx = content.indexOf(endStr);
if (startIdx !== -1 && endIdx !== -1) {
  const newContent = `
          <h4 style="margin: 0 0 15px; font-size: 1.1rem; color: #111827; font-weight: 600; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Edit Product Details</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 6px;">Title</label>
              <input type="text" id="editTitle" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; transition: border-color 0.2s;">
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 6px;">Price ($)</label>
              <input type="number" id="editPrice" step="0.01" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; transition: border-color 0.2s;">
            </div>
          </div>
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 6px;">Tags / Keywords (comma separated)</label>
          <input type="text" id="editKeywords" placeholder="e.g. fashion, summer, tops" style="width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; transition: border-color 0.2s;">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #4b5563; margin-bottom: 6px;">Description</label>
          <textarea id="editDescription" rows="4" style="width: 100%; box-sizing: border-box; padding: 10px; margin-bottom: 16px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; line-height: 1.5; transition: border-color 0.2s;"></textarea>
          <button type="button" id="saveProductBtn" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">Save Changes</button>
`;
  content = content.substring(0, startIdx) + newContent + content.substring(endIdx);
  fs.writeFileSync('public/product.html', content);
  console.log('Replaced');
} else {
  console.log('Not found');
}
