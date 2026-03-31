# NC Iterative Methods Calculator

A web-based calculator for solving systems of linear equations using **Jacobi** and **Gauss-Seidel** iterative methods.

## Features

- **Jacobi Method** — Simultaneous update iterative solver
- **Gauss-Seidel Method** — Sequential update iterative solver (typically faster convergence)
- **NxN matrices** (2×2 to 6×6) with configurable tolerance and max iterations
- **Step-by-step solutions** showing each iteration's variable updates
- **Convergence analysis** — Diagonal dominance check with warnings
- **Iteration table** tracking convergence and error per iteration
- **Compare mode** — Side-by-side Jacobi vs Gauss-Seidel comparison
- **Share links** — Encode problem in URL for sharing
- **LaTeX export** — Copy-ready LaTeX for academic papers
- **Dark/Light theme** with system preference detection
- **Responsive design** — Works on mobile, tablet, and desktop
- **Calculation history** stored in localStorage
- **Import** — Paste augmented matrices directly
- **Print-friendly** output

## Tech Stack

- Vanilla HTML, CSS, JavaScript
- [math.js](https://mathjs.org/) from CDN
- Docker + nginx for deployment

## Development

Open `index.html` in a browser. No build step required.

## Docker

```bash
docker compose up -d --build
```

## Live

[https://nc.arose-niazi.me/iterative/](https://nc.arose-niazi.me/iterative/)

## License

MIT
