"""Builds Part3_manual_calculations.pdf from manual_calc.py (same numbers as the code)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Preformatted, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from manual_calc import all_iterations, f

pdfmetrics.registerFont(TTFont("DV", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DVB", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("DVM", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"))
H = ParagraphStyle("H", fontName="DVB", fontSize=14, spaceAfter=8)
T = ParagraphStyle("T", fontName="DV", fontSize=10, leading=14, spaceAfter=6)
M = ParagraphStyle("M", fontName="DVM", fontSize=7.6, leading=10.4)

blocks, summary = all_iterations()
S = []
S += [Paragraph("Part 3: Gradient Descent, Manual Calculations (matrix form)", H),
      Paragraph("<b>Model.</b> From the brief, y = m₁x₁ + m₂x₂ + b. In matrix form ŷ = Xm + b, i.e. ŷᵢ = m₁xᵢ₁ + m₂xᵢ₂ + bᵢ, with n = 2 data points and b a vector with one entry per data point (b = [1, 1]ᵀ).", T),
      Paragraph("X = [[1, 3], [4, 10]],  y = [5, 6]ᵀ,  m₀ = [−1, 2]ᵀ,  b₀ = [1, 1]ᵀ,  learning rate α = 0.01 (not given in the assignment; chosen and stated).", T),
      Paragraph("<b>Cost.</b> J(m,b) = (1/n) Σ (ŷᵢ − yᵢ)² = (1/n) eᵀe, where e = ŷ − y = Xm + b − y.", T),
      Paragraph("<b>Chain rule for ∂J/∂m.</b>  J = (1/n) eᵀe  ⇒  ∂J/∂e = (2/n) eᵀ.   e = Xm + b − y  ⇒  ∂e/∂m = X.   "
                "So ∂J/∂m = (∂J/∂e)(∂e/∂m) = (2/n) eᵀX, written as a column:  <b>∂J/∂m = (2/n) Xᵀe</b>.", T),
      Paragraph("<b>Chain rule for ∂J/∂b.</b>  ∂e/∂b = I (identity, because b is a vector with one entry per data point).   "
                "So ∂J/∂b = (∂J/∂e)(∂e/∂b) = (2/n) eᵀ I, i.e. <b>∂J/∂b = (2/n) e</b>.", T),
      Paragraph("<b>Same chain rule, element by element (no matrix shorthand).</b>  J = (1/n) Σᵢ (ŷᵢ − yᵢ)².  "
                "∂J/∂ŷᵢ = (2/n)(ŷᵢ − yᵢ) = (2/n)eᵢ.   ∂ŷᵢ/∂mⱼ = xᵢⱼ.   ∂ŷᵢ/∂bₖ = 1 if k = i, otherwise 0.   "
                "Therefore ∂J/∂mⱼ = Σᵢ (∂J/∂ŷᵢ)(∂ŷᵢ/∂mⱼ) = (2/n) Σᵢ eᵢxᵢⱼ = (2/n)(Xᵀe)ⱼ,  and ∂J/∂bₖ = (2/n)eₖ.", T),
      Paragraph("<b>Update rule.</b>  m ← m − α ∂J/∂m,   b ← b − α ∂J/∂b.   Number of updates = number of group members = 3 (one per member).", T),
      Paragraph("<b>Step-size check.</b> The Hessian of J w.r.t. m is (2/n)XᵀX = [[17, 43], [43, 109]], largest eigenvalue ≈ 125.97, so α must be below 2/125.97 ≈ 0.0159. α = 0.01 satisfies this.", T),
      PageBreak()]
for blk in blocks:
    S += [Preformatted("\n".join(blk), M), Spacer(1, 14)]
S.append(Spacer(1, 10))
S.append(Paragraph("Summary of results", H))
rows = [["Iteration", "m₁", "m₂", "b₁", "b₂", "J after update"]]
rows.append(["0 (start)", "-1", "2", "1", "1", "61"])
for it, m, b, J in summary[1:]:
    rows.append([it, f(m[0]), f(m[1]), f(b[0]), f(b[1]), f(J)])
t = Table(rows, hAlign="LEFT")
t.setStyle(TableStyle([("FONTNAME", (0, 0), (-1, -1), "DV"), ("FONTSIZE", (0, 0), (-1, -1), 9),
                       ("GRID", (0, 0), (-1, -1), .5, colors.grey), ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey)]))
S += [t, Spacer(1, 12),
      Paragraph("<b>Trend.</b> J falls every update: 61 → 6.5033 → 2.4974 → 2.1645, so the updates reduce the error. The first step overshoots m (m₁: −1 → −1.45, m₂: 2 → 0.87) because the first gradient (45, 113) is large; the next steps pull m back (m₂: 0.87 → 1.1765 → 1.0956). The biases change little. The back-and-forth in m is caused by the steep direction of the cost surface, but α = 0.01 is small enough for the error to keep decreasing.", T),
      Paragraph("Verification: these values equal the output of gradient_descent.py, and SciPy's numerical derivative of J matches the analytic gradient at the starting point ([45, 113] and [1, 11]).", T)]
SimpleDocTemplate("Part3_manual_calculations.pdf", pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm, topMargin=1.8*cm, bottomMargin=1.8*cm).build(S)
print("pdf ok")
