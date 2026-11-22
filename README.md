# 殘響 ECHOES

以文字與系統視窗為主的冒險養成遊戲：每日任務與懲罰、界隙探索、回合制首領戰、收服首領組成殘響軍團。

## 遊玩

用瀏覽器開啟 `index.html` 即可，不需安裝。

## 檔案

- `index.html`、`style.css`：遊戲頁面與樣式
- `src/engine.js`：遊戲邏輯（不依賴瀏覽器）
- `src/ui.js`：介面與演出
- `src/audio.js`：即時合成的音效與環境音
- `src/art-gen.js`：以程式繪製的預設美術圖
- `src/assets.js`：美術素材清單與 AI 產圖提示詞
- `art-guide.html`：產圖指南；把圖放進 `assets/img/` 會取代預設圖
- `palettes.html`：配色對照

## 測試

```
node test/smoke.js
```
