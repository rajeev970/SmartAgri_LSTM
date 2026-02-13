# Paper Figures — Export Instructions

The diagrams in `SmartAgri_Paper.md` use **Mermaid** syntax. To use them as figures in a LaTeX/Word submission:

## Option 1: Mermaid Live Editor (Recommended)

1. Go to **[mermaid.live](https://mermaid.live)**
2. Copy each flowchart block from the paper (the code between \`\`\`mermaid and \`\`\`)
3. Paste into the editor — it renders live
4. Click **"Actions" → "Export as PNG** or **SVG**
5. Save as `figure1_system_architecture.png`, `figure2_data_pipeline.png`, etc.

## Option 2: VS Code

1. Install the **Mermaid** extension
2. Open the paper; Mermaid diagrams render in preview
3. Right-click diagram → Export to PNG/SVG (if supported)

## Option 3: Pandoc (for PDF)

```bash
pandoc SmartAgri_Paper.md -o paper.pdf --filter mermaid-filter
```

(Requires `mermaid-filter` and Node.js)

## Figure List

| Figure | Description | Section |
|--------|-------------|---------|
| Figure 1 | System Architecture | IV.A |
| Figure 2 | Data Pipeline Flowchart | IV.B |
| Figure 3 | LSTM Model Architecture | IV.C |
| Figure 4 | Prediction Workflow | IV.D |

## For LaTeX

Insert in your `.tex` file:

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{figure1_system_architecture.png}
  \caption{SmartAgri System Architecture}
  \label{fig:architecture}
\end{figure}
```

---

## UI Screenshots for the Web Interface

Take screenshots of the SmartAgri web app (http://localhost:3000) for the publication. Save them in this folder.

### How to Capture (Windows)

1. **Full-page screenshot (recommended):**
   - Chrome: `F12` → `Ctrl+Shift+P` → type "Capture full size screenshot" → Enter
   - Or: `Win+Shift+S` (Snipping Tool) → select area

2. **For high resolution:** Zoom the browser to 100% or 125% before capturing.

### Screenshots to Take

| File Name | Screen | How to Get |
|-----------|--------|------------|
| `screenshot_dashboard.png` | Dashboard with price graph | Login (demo/demo) → Dashboard → Select a crop (e.g., Rice) → Wait for graph to load |
| `screenshot_price_analysis.png` | Price Analysis page | Sidebar → Price Analysis → Select crop, state, days |
| `screenshot_predictions_form.png` | Predictions form | Sidebar → Predictions → Fill form (crop, state, district, date) |
| `screenshot_predictions_result.png` | Prediction result | After submitting form → Shows predicted price, confidence, price range |
| `screenshot_login.png` | Login page | Logout first → Capture login screen |

### Suggested Captions for Paper

- **Dashboard:** "SmartAgri Dashboard showing historical price trends for a selected commodity."
- **Price Analysis:** "Price Analysis module with temporal filtering and state/district selection."
- **Predictions:** "Crop price prediction interface with LSTM-based forecasting and confidence scores."
