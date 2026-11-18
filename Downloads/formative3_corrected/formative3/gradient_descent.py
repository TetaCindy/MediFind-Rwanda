"""Gradient descent for y_hat = X m + b with matrix operations (no scalar shortcuts).

Shapes (n = 2 data points, d = 2 features):
    X (n, d)   m (d,)   b (n,)   y (n,)   y_hat = X @ m + b
    J = (1/n) * (y_hat - y)^T (y_hat - y)
"""
import numpy as np
from scipy.differentiate import derivative

# ---------- model & cost -------------------------------------------------
def predict(X, m, b):
    return X @ m + b


def mse(X, m, b, y):
    e = predict(X, m, b) - y
    return float(e @ e) / len(y)


# ---------- analytic gradients (chain rule, matrix form) ------------------
def gradients(X, m, b, y):
    """dJ/dm = (2/n) X^T e   and   dJ/db = (2/n) e,   with e = y_hat - y.
    Chain rule: dJ/dm = (dJ/de)(de/dy_hat)(dy_hat/dm) = (2/n) e^T * I * X."""
    n = len(y)
    e = predict(X, m, b) - y
    return (2 / n) * (X.T @ e), (2 / n) * e


# ---------- SciPy derivative of an arbitrary equation ----------------------
def derivative_of_equation(equation, x0):
    """Numerical derivative f'(x0) of any single-variable equation f, using SciPy."""
    return float(derivative(equation, x0).df)


def numerical_gradients(X, m, b, y):
    """Differentiate J with respect to every parameter using derivative_of_equation.
    Used to verify the analytic matrix gradients."""
    params = np.concatenate([m, b])
    d = len(m)

    def cost_with(i):
        def f(t):                                  # J as a function of ONE parameter
            t = np.asarray(t, dtype=float)
            out = np.empty_like(t)
            for idx, val in np.ndenumerate(t):
                p = params.copy(); p[i] = val
                out[idx] = mse(X, p[:d], p[d:], y)
            return out
        return f

    g = np.array([derivative_of_equation(cost_with(i), params[i]) for i in range(len(params))])
    return g[:d], g[d:]


# ---------- the update loop (every step visible) ---------------------------
def gradient_descent(X, y, m0, b0, lr, n_iter, verbose=False, gradient_fn=gradients):
    """gradient_fn(X, m, b, y) -> (dJ/dm, dJ/db). Default = analytic matrix gradients;
    pass numerical_gradients to let SciPy's derivative drive every update instead."""
    m, b = np.array(m0, dtype=float), np.array(b0, dtype=float)
    history = [dict(iter=0, m=m.copy(), b=b.copy(), J=mse(X, m, b, y))]
    for t in range(1, n_iter + 1):
        y_hat = predict(X, m, b)                   # 1. predictions
        grad_m, grad_b = gradient_fn(X, m, b, y)   # 2. gradients
        m = m - lr * grad_m                        # 3. update m
        b = b - lr * grad_b                        #    update b
        J = mse(X, m, b, y)                        # 4. new error
        history.append(dict(iter=t, m=m.copy(), b=b.copy(), J=J, y_hat=y_hat,
                            grad_m=grad_m, grad_b=grad_b))
        if verbose:
            print(f"iter {t}: y_hat_before={y_hat}, grad_m={grad_m}, grad_b={grad_b}, "
                  f"m={m}, b={b}, J={J:.6f}")
    return m, b, history
