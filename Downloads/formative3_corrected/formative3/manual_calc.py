"""Generates the step-by-step Part 3 worksheet using exact Decimal arithmetic (no rounding)."""
from decimal import Decimal as D, getcontext
getcontext().prec = 60

X = [[D(1), D(3)], [D(4), D(10)]]
y = [D(5), D(6)]
n = 2
lr = D("0.01")


def f(v):
    """Exact decimal, trailing zeros removed."""
    s = format(v.normalize(), "f")
    return s


def iteration_steps(m, b, k, member):
    L = [f"ITERATION {k}  (Member {member})", f"Start: m = [{f(m[0])}, {f(m[1])}]^T,  b = [{f(b[0])}, {f(b[1])}]^T"]
    Xm = [X[i][0] * m[0] + X[i][1] * m[1] for i in range(2)]
    L.append("Step 1. Xm (row by row):")
    for i in range(2):
        L.append(f"   row {i+1}: ({f(X[i][0])})({f(m[0])}) + ({f(X[i][1])})({f(m[1])}) = ({f(X[i][0]*m[0])}) + ({f(X[i][1]*m[1])}) = {f(Xm[i])}")
    yh = [Xm[i] + b[i] for i in range(2)]
    L.append("Step 2. y_hat = Xm + b:")
    for i in range(2):
        L.append(f"   y_hat_{i+1} = {f(Xm[i])} + {f(b[i])} = {f(yh[i])}")
    e = [yh[i] - y[i] for i in range(2)]
    L.append("Step 3. e = y_hat - y:")
    for i in range(2):
        L.append(f"   e_{i+1} = {f(yh[i])} - {f(y[i])} = {f(e[i])}")
    J = (e[0] ** 2 + e[1] ** 2) / n
    L.append(f"Step 4. J = (1/n) e^T e = (1/2)[({f(e[0])})^2 + ({f(e[1])})^2] = (1/2)({f(e[0]**2)} + {f(e[1]**2)}) = {f(J)}")
    c = D(2) / n
    gm = [c * (X[0][j] * e[0] + X[1][j] * e[1]) for j in range(2)]
    L.append("Step 5. dJ/dm = (2/n) X^T e = (2/2) X^T e   [X^T uses COLUMNS of X]:")
    for j in range(2):
        L.append(f"   component {j+1}: (1)[({f(X[0][j])})({f(e[0])}) + ({f(X[1][j])})({f(e[1])})] = ({f(X[0][j]*e[0])}) + ({f(X[1][j]*e[1])}) = {f(gm[j])}")
    gb = [c * e[i] for i in range(2)]
    L.append("Step 6. dJ/db = (2/n) e = (2/2) e:")
    for i in range(2):
        L.append(f"   component {i+1}: (1)({f(e[i])}) = {f(gb[i])}")
    mn = [m[j] - lr * gm[j] for j in range(2)]
    bn = [b[i] - lr * gb[i] for i in range(2)]
    L.append(f"Step 7. Update with alpha = {f(lr)}:   m_new = m - alpha * dJ/dm,   b_new = b - alpha * dJ/db")
    for j in range(2):
        L.append(f"   m_{j+1} = {f(m[j])} - ({f(lr)})({f(gm[j])}) = {f(m[j])} - ({f(lr*gm[j])}) = {f(mn[j])}")
    for i in range(2):
        L.append(f"   b_{i+1} = {f(b[i])} - ({f(lr)})({f(gb[i])}) = {f(b[i])} - ({f(lr*gb[i])}) = {f(bn[i])}")
    yn = [X[i][0] * mn[0] + X[i][1] * mn[1] + bn[i] for i in range(2)]
    Jn = ((yn[0] - y[0]) ** 2 + (yn[1] - y[1]) ** 2) / n
    L.append(f"Check: new predictions = [{f(yn[0])}, {f(yn[1])}],  new J = {f(Jn)}")
    return L, mn, bn, J, Jn


def all_iterations(members=("A", "B", "C")):
    m, b = [D(-1), D(2)], [D(1), D(1)]
    blocks, summary = [], [("0", m[:], b[:], None)]
    for k, mem in enumerate(members, 1):
        L, m, b, J, Jn = iteration_steps(m, b, k, mem)
        blocks.append(L); summary.append((str(k), m[:], b[:], Jn))
    return blocks, summary


if __name__ == "__main__":
    blocks, summary = all_iterations()
    for blk in blocks:
        print("\n".join(blk)); print()
