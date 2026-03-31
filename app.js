/* ============================================================
   NC Iterative Methods — Jacobi & Gauss-Seidel Calculator
   Complete implementation: step-by-step, compare, history, share
   ============================================================ */

(function () {
  'use strict';

  // ===== SUBSCRIPT HELPER =====
  var SUB = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';
  function sub(n) { return String(n).split('').map(function (c) { return SUB[c] || c; }).join(''); }
  function sup(n) { return '⁽' + String(n).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[c] || c; }).join('') + '⁾'; }

  // ===== DOM REFS =====
  var sizeSelect = document.getElementById('matrix-size');
  var methodSelect = document.getElementById('method-select');
  var toleranceSelect = document.getElementById('tolerance-input');
  var maxIterSelect = document.getElementById('max-iterations');
  var compareToggle = document.getElementById('compare-toggle');
  var matrixGrid = document.getElementById('matrix-grid');
  var bVectorInputs = document.getElementById('b-vector-inputs');
  var guessInputs = document.getElementById('initial-guess-inputs');
  var calcBtn = document.getElementById('calculate-btn');
  var randomBtn = document.getElementById('random-btn');
  var clearBtn = document.getElementById('clear-btn');
  var importToggleBtn = document.getElementById('import-toggle-btn');
  var importSection = document.getElementById('import-section');
  var importText = document.getElementById('import-text');
  var importBtn = document.getElementById('import-btn');
  var outputEl = document.getElementById('output');
  var themeToggle = document.getElementById('theme-toggle');
  var historyToggle = document.getElementById('history-toggle-btn');
  var historyPanel = document.getElementById('history-panel');
  var historyList = document.getElementById('history-list');
  var clearHistoryBtn = document.getElementById('clear-history-btn');

  // ===== STATE =====
  var currentSize = 3;
  var history = JSON.parse(localStorage.getItem('nc-iter-history') || '[]');

  // ===== THEME =====
  function initTheme() {
    var saved = localStorage.getItem('nc-iter-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️';
    }
  }

  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nc-iter-theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // ===== MATRIX GRID =====
  function buildGrid(n) {
    currentSize = n;
    matrixGrid.innerHTML = '';
    bVectorInputs.innerHTML = '';
    guessInputs.innerHTML = '';

    for (var i = 0; i < n; i++) {
      var row = document.createElement('div');
      row.className = 'matrix-input-row';
      for (var j = 0; j < n; j++) {
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'matrix-input';
        inp.placeholder = 'a' + sub(i + 1) + sub(j + 1);
        inp.setAttribute('data-row', i);
        inp.setAttribute('data-col', j);
        inp.step = 'any';
        row.appendChild(inp);
      }
      matrixGrid.appendChild(row);

      // b vector
      var bInp = document.createElement('input');
      bInp.type = 'number';
      bInp.className = 'matrix-input b-input';
      bInp.placeholder = 'b' + sub(i + 1);
      bInp.setAttribute('data-idx', i);
      bInp.step = 'any';
      bVectorInputs.appendChild(bInp);

      // initial guess
      var gInp = document.createElement('input');
      gInp.type = 'number';
      gInp.className = 'matrix-input b-input';
      gInp.placeholder = 'x' + sub(i + 1);
      gInp.setAttribute('data-idx', i);
      gInp.step = 'any';
      guessInputs.appendChild(gInp);
    }
  }

  sizeSelect.addEventListener('change', function () {
    buildGrid(parseInt(this.value));
    outputEl.innerHTML = '';
  });

  // ===== READ INPUT =====
  function readMatrix() {
    var n = currentSize;
    var A = [], b = [], x0 = [];
    var valid = true;

    var aInputs = matrixGrid.querySelectorAll('.matrix-input');
    for (var i = 0; i < n; i++) {
      A[i] = [];
      for (var j = 0; j < n; j++) {
        var inp = aInputs[i * n + j];
        var v = parseFloat(inp.value);
        if (isNaN(v)) { inp.classList.add('input-error'); valid = false; }
        else { inp.classList.remove('input-error'); }
        A[i][j] = v;
      }
    }

    var bInputs = bVectorInputs.querySelectorAll('.matrix-input');
    for (var i = 0; i < n; i++) {
      var v = parseFloat(bInputs[i].value);
      if (isNaN(v)) { bInputs[i].classList.add('input-error'); valid = false; }
      else { bInputs[i].classList.remove('input-error'); }
      b[i] = v;
    }

    var gInputs = guessInputs.querySelectorAll('.matrix-input');
    for (var i = 0; i < n; i++) {
      var v = parseFloat(gInputs[i].value);
      x0[i] = isNaN(v) ? 0 : v;
      gInputs[i].classList.remove('input-error');
    }

    return { A: A, b: b, x0: x0, n: n, valid: valid };
  }

  // ===== DIAGONAL DOMINANCE CHECK =====
  function checkDiagonalDominance(A, n) {
    var dominant = true;
    var strictCount = 0;
    var details = [];
    for (var i = 0; i < n; i++) {
      var diag = Math.abs(A[i][i]);
      var offSum = 0;
      for (var j = 0; j < n; j++) {
        if (j !== i) offSum += Math.abs(A[i][j]);
      }
      var strict = diag > offSum;
      var weak = diag >= offSum;
      if (!weak) dominant = false;
      if (strict) strictCount++;
      details.push({
        row: i + 1,
        diag: diag,
        offSum: offSum,
        strict: strict,
        weak: weak
      });
    }
    return {
      isStrictlyDD: strictCount === n,
      isWeaklyDD: dominant,
      details: details
    };
  }

  // ===== JACOBI METHOD =====
  function jacobi(A, b, x0, n, tol, maxIter) {
    var iterations = [];
    var steps = [];
    var x = x0.slice();
    var converged = false;
    var convergedAt = -1;

    steps.push({ type: 'info', html: '<p>The <strong>Jacobi method</strong> updates all variables simultaneously using values from the <em>previous</em> iteration:</p>' });
    steps.push({ type: 'info', html: '<p style="font-family:var(--font-mono);background:var(--bg-secondary);padding:0.5rem 0.75rem;border-radius:var(--radius-sm);">x' + sub('i') + sup('k+1') + ' = (1/a' + sub('ii') + ') · (b' + sub('i') + ' − Σ' + sub('j≠i') + ' a' + sub('ij') + '·x' + sub('j') + sup('k') + ')</p>' });

    for (var k = 0; k < maxIter; k++) {
      var xNew = new Array(n);
      var iterSteps = [];
      steps.push({ type: 'heading', text: 'Iteration ' + (k + 1) });

      for (var i = 0; i < n; i++) {
        var sum = 0;
        var terms = [];
        for (var j = 0; j < n; j++) {
          if (j !== i) {
            sum += A[i][j] * x[j];
            terms.push('(' + fmt(A[i][j]) + ')·(' + fmt(x[j]) + ')');
          }
        }
        xNew[i] = (b[i] - sum) / A[i][i];

        var formula = 'x' + sub(i + 1) + sup(k + 1) + ' = (1/' + fmt(A[i][i]) + ') · (' + fmt(b[i]) + ' − [' + terms.join(' + ') + '])';
        var result = 'x' + sub(i + 1) + sup(k + 1) + ' = (1/' + fmt(A[i][i]) + ') · (' + fmt(b[i]) + ' − ' + fmt(sum) + ') = <strong>' + fmt(xNew[i]) + '</strong>';
        iterSteps.push(formula);
        iterSteps.push(result);
      }

      steps.push({ type: 'step', substeps: iterSteps });

      // Compute error (max absolute change)
      var error = 0;
      for (var i = 0; i < n; i++) {
        error = Math.max(error, Math.abs(xNew[i] - x[i]));
      }

      iterations.push({ k: k + 1, x: xNew.slice(), error: error });

      if (error < tol && !converged) {
        converged = true;
        convergedAt = k + 1;
      }

      x = xNew;

      if (converged) break;
    }

    return { method: 'Jacobi', iterations: iterations, steps: steps, converged: converged, convergedAt: convergedAt, solution: x };
  }

  // ===== GAUSS-SEIDEL METHOD =====
  function gaussSeidel(A, b, x0, n, tol, maxIter) {
    var iterations = [];
    var steps = [];
    var x = x0.slice();
    var converged = false;
    var convergedAt = -1;

    steps.push({ type: 'info', html: '<p>The <strong>Gauss-Seidel method</strong> updates variables sequentially, using the <em>latest available</em> values immediately:</p>' });
    steps.push({ type: 'info', html: '<p style="font-family:var(--font-mono);background:var(--bg-secondary);padding:0.5rem 0.75rem;border-radius:var(--radius-sm);">x' + sub('i') + sup('k+1') + ' = (1/a' + sub('ii') + ') · (b' + sub('i') + ' − Σ' + sub('j<i') + ' a' + sub('ij') + '·x' + sub('j') + sup('k+1') + ' − Σ' + sub('j>i') + ' a' + sub('ij') + '·x' + sub('j') + sup('k') + ')</p>' });

    for (var k = 0; k < maxIter; k++) {
      var xOld = x.slice();
      var iterSteps = [];
      steps.push({ type: 'heading', text: 'Iteration ' + (k + 1) });

      for (var i = 0; i < n; i++) {
        var sum = 0;
        var terms = [];
        for (var j = 0; j < n; j++) {
          if (j !== i) {
            sum += A[i][j] * x[j]; // x[j] already updated if j < i
            var label = j < i ? sup(k + 1) : sup(k);
            terms.push('(' + fmt(A[i][j]) + ')·(' + fmt(x[j]) + ')' + (j < i ? ' ←new' : ''));
          }
        }
        x[i] = (b[i] - sum) / A[i][i];

        var formula = 'x' + sub(i + 1) + sup(k + 1) + ' = (1/' + fmt(A[i][i]) + ') · (' + fmt(b[i]) + ' − [' + terms.join(' + ') + '])';
        var result = 'x' + sub(i + 1) + sup(k + 1) + ' = (1/' + fmt(A[i][i]) + ') · (' + fmt(b[i]) + ' − ' + fmt(sum) + ') = <strong>' + fmt(x[i]) + '</strong>';
        iterSteps.push(formula);
        iterSteps.push(result);
      }

      steps.push({ type: 'step', substeps: iterSteps });

      var error = 0;
      for (var i = 0; i < n; i++) {
        error = Math.max(error, Math.abs(x[i] - xOld[i]));
      }

      iterations.push({ k: k + 1, x: x.slice(), error: error });

      if (error < tol && !converged) {
        converged = true;
        convergedAt = k + 1;
      }

      if (converged) break;
    }

    return { method: 'Gauss-Seidel', iterations: iterations, steps: steps, converged: converged, convergedAt: convergedAt, solution: x };
  }

  // ===== NUMBER FORMAT =====
  function fmt(v) {
    if (Number.isInteger(v)) return String(v);
    // Show up to 6 decimal places, strip trailing zeros
    var s = v.toFixed(6).replace(/\.?0+$/, '');
    return s;
  }

  function fmtShort(v) {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(6).replace(/\.?0+$/, '');
  }

  function fmtSci(v) {
    if (v === 0) return '0';
    return v.toExponential(4);
  }

  // ===== RENDER RESULTS =====
  function renderResult(result, ddCheck, n, A, b, x0, tol) {
    var html = '';

    // Convergence check
    if (ddCheck.isStrictlyDD) {
      html += '<div class="convergence-success">✓ Matrix is <strong>strictly diagonally dominant</strong> — convergence guaranteed for both methods.</div>';
    } else if (ddCheck.isWeaklyDD) {
      html += '<div class="convergence-warning">⚠ Matrix is weakly diagonally dominant — convergence is likely but not guaranteed.</div>';
    } else {
      html += '<div class="convergence-warning">⚠ Matrix is <strong>NOT diagonally dominant</strong> — convergence is not guaranteed. Results may diverge.</div>';
    }

    // DD details
    html += '<details class="steps-details"><summary>Diagonal Dominance Details</summary><div class="steps-content">';
    for (var i = 0; i < ddCheck.details.length; i++) {
      var d = ddCheck.details[i];
      var status = d.strict ? '✓ strict' : (d.weak ? '≈ weak' : '✗ not dominant');
      html += '<div class="step-block"><div class="step-line">Row ' + d.row + ': |a' + sub(d.row) + sub(d.row) + '| = ' + fmt(d.diag) + '  vs  Σ|a' + sub(d.row) + sub('j') + '| = ' + fmt(d.offSum) + ' → ' + status + '</div></div>';
    }
    html += '</div></details>';

    // Result status
    if (result.converged) {
      html += '<div class="solution-summary"><strong>Converged</strong> in ' + result.convergedAt + ' iteration' + (result.convergedAt > 1 ? 's' : '') + ' (tolerance: ' + tol + ')<br>';
      for (var i = 0; i < n; i++) {
        html += 'x' + sub(i + 1) + ' = ' + fmtShort(result.solution[i]);
        if (i < n - 1) html += ', &nbsp;';
      }
      html += '</div>';
    } else {
      html += '<div class="error-message">Did not converge within ' + result.iterations.length + ' iterations. Last error: ' + fmtSci(result.iterations[result.iterations.length - 1].error) + '</div>';
    }

    // Iteration table
    html += '<div class="result-section"><h3>Iteration Table</h3>';
    html += '<div class="iteration-table-wrapper"><table class="iteration-table"><thead><tr>';
    html += '<th>k</th>';
    for (var i = 0; i < n; i++) html += '<th>x' + sub(i + 1) + '</th>';
    html += '<th>Error</th></tr></thead><tbody>';

    // Initial guess row
    html += '<tr><td>0</td>';
    for (var i = 0; i < n; i++) html += '<td>' + fmtShort(x0[i]) + '</td>';
    html += '<td>—</td></tr>';

    for (var r = 0; r < result.iterations.length; r++) {
      var iter = result.iterations[r];
      var rowClass = (result.converged && r === result.iterations.length - 1) ? ' class="converged-row"' : '';
      html += '<tr' + rowClass + '>';
      html += '<td>' + iter.k + '</td>';
      for (var i = 0; i < n; i++) html += '<td>' + fmtShort(iter.x[i]) + '</td>';
      html += '<td class="error-col">' + fmtSci(iter.error) + '</td>';
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';

    // Step-by-step
    html += '<details class="steps-details"><summary>Step-by-Step Solution</summary><div class="steps-content">';
    for (var s = 0; s < result.steps.length; s++) {
      var step = result.steps[s];
      if (step.type === 'info') html += step.html;
      else if (step.type === 'heading') html += '<div class="step-heading">' + step.text + '</div>';
      else if (step.type === 'step') {
        html += '<div class="step-block">';
        for (var l = 0; l < step.substeps.length; l++) {
          html += '<div class="step-line">' + step.substeps[l] + '</div>';
        }
        html += '</div>';
      }
    }
    html += '</div></details>';

    return html;
  }

  // ===== LATEX EXPORT =====
  function generateLaTeX(result, A, b, x0, n, tol, method) {
    var lines = [];
    lines.push('% ' + method + ' Method — LaTeX Export');
    lines.push('% Generated by NC Iterative Methods Calculator');
    lines.push('');
    lines.push('\\textbf{System of equations:}');
    lines.push('\\[');
    lines.push('A = \\begin{bmatrix}');
    for (var i = 0; i < n; i++) {
      lines.push('  ' + A[i].map(function (v) { return fmt(v); }).join(' & ') + (i < n - 1 ? ' \\\\' : ''));
    }
    lines.push('\\end{bmatrix}, \\quad');
    lines.push('b = \\begin{bmatrix} ' + b.map(function (v) { return fmt(v); }).join(' \\\\ ') + ' \\end{bmatrix}');
    lines.push('\\]');
    lines.push('');
    lines.push('\\textbf{Initial guess:} $x^{(0)} = \\begin{bmatrix} ' + x0.map(function (v) { return fmt(v); }).join(' \\\\ ') + ' \\end{bmatrix}$');
    lines.push('\\textbf{Tolerance:} $\\epsilon = ' + tol + '$');
    lines.push('');
    lines.push('\\textbf{Iteration Table:}');
    lines.push('\\begin{tabular}{c' + 'c'.repeat(n) + 'c}');
    lines.push('\\hline');
    var header = '$k$';
    for (var i = 0; i < n; i++) header += ' & $x_{' + (i + 1) + '}$';
    header += ' & Error \\\\';
    lines.push(header);
    lines.push('\\hline');
    lines.push('0 & ' + x0.map(function (v) { return fmt(v); }).join(' & ') + ' & --- \\\\');
    for (var r = 0; r < result.iterations.length; r++) {
      var iter = result.iterations[r];
      lines.push(iter.k + ' & ' + iter.x.map(function (v) { return fmtShort(v); }).join(' & ') + ' & ' + fmtSci(iter.error) + ' \\\\');
    }
    lines.push('\\hline');
    lines.push('\\end{tabular}');

    if (result.converged) {
      lines.push('');
      lines.push('\\textbf{Solution (converged in ' + result.convergedAt + ' iterations):}');
      lines.push('\\[');
      lines.push('x = \\begin{bmatrix} ' + result.solution.map(function (v) { return fmtShort(v); }).join(' \\\\ ') + ' \\end{bmatrix}');
      lines.push('\\]');
    }

    return lines.join('\n');
  }

  // ===== SHARE URL =====
  function buildShareURL(A, b, x0, n, method, tol, maxIter) {
    var params = new URLSearchParams();
    params.set('n', n);
    params.set('m', method);
    params.set('t', tol);
    params.set('mi', maxIter);
    params.set('A', A.map(function (r) { return r.join(','); }).join(';'));
    params.set('b', b.join(','));
    params.set('x0', x0.join(','));
    return window.location.origin + window.location.pathname + '?' + params.toString();
  }

  function loadFromURL() {
    var params = new URLSearchParams(window.location.search);
    if (!params.has('A')) return false;

    try {
      var n = parseInt(params.get('n'));
      if (n < 2 || n > 6) return false;
      sizeSelect.value = n;
      buildGrid(n);

      methodSelect.value = params.get('m') || 'jacobi';
      toleranceSelect.value = params.get('t') || '0.001';
      maxIterSelect.value = params.get('mi') || '25';

      var A = params.get('A').split(';').map(function (r) { return r.split(',').map(Number); });
      var b = params.get('b').split(',').map(Number);
      var x0 = params.get('x0') ? params.get('x0').split(',').map(Number) : new Array(n).fill(0);

      var aInputs = matrixGrid.querySelectorAll('.matrix-input');
      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          aInputs[i * n + j].value = A[i][j];
        }
      }

      var bInputsEls = bVectorInputs.querySelectorAll('.matrix-input');
      for (var i = 0; i < n; i++) bInputsEls[i].value = b[i];

      var gInputsEls = guessInputs.querySelectorAll('.matrix-input');
      for (var i = 0; i < n; i++) {
        if (x0[i] !== 0) gInputsEls[i].value = x0[i];
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // ===== CALCULATE =====
  function calculate() {
    var input = readMatrix();
    if (!input.valid) {
      outputEl.innerHTML = '<div class="error-message">Please fill in all matrix and vector values with valid numbers.</div>';
      return;
    }

    var A = input.A, b = input.b, x0 = input.x0, n = input.n;
    var method = methodSelect.value;
    var tol = parseFloat(toleranceSelect.value);
    var maxIter = parseInt(maxIterSelect.value);
    var compare = compareToggle.checked;

    // Check for zero diagonals
    for (var i = 0; i < n; i++) {
      if (A[i][i] === 0) {
        outputEl.innerHTML = '<div class="error-message">Diagonal element a' + sub(i + 1) + sub(i + 1) + ' is zero. Iterative methods require non-zero diagonal elements. Consider rearranging the system.</div>';
        return;
      }
    }

    var ddCheck = checkDiagonalDominance(A, n);

    if (compare) {
      var jacobiResult = jacobi(A, b, x0, n, tol, maxIter);
      var gsResult = gaussSeidel(A, b, x0, n, tol, maxIter);

      var html = '<div class="compare-wrapper">';
      html += '<div class="result-panel"><div class="result-title">Jacobi Method</div>';
      html += renderResult(jacobiResult, ddCheck, n, A, b, x0, tol);
      // LaTeX
      html += '<details class="latex-details"><summary>LaTeX Export</summary><div class="latex-content">';
      html += '<pre class="latex-code">' + escHTML(generateLaTeX(jacobiResult, A, b, x0, n, tol, 'Jacobi')) + '</pre>';
      html += '<button class="btn btn-small btn-copy" onclick="copyLatex(this)">Copy LaTeX</button>';
      html += '</div></details>';
      html += '</div>';

      html += '<div class="result-panel"><div class="result-title">Gauss-Seidel Method</div>';
      html += renderResult(gsResult, ddCheck, n, A, b, x0, tol);
      html += '<details class="latex-details"><summary>LaTeX Export</summary><div class="latex-content">';
      html += '<pre class="latex-code">' + escHTML(generateLaTeX(gsResult, A, b, x0, n, tol, 'Gauss-Seidel')) + '</pre>';
      html += '<button class="btn btn-small btn-copy" onclick="copyLatex(this)">Copy LaTeX</button>';
      html += '</div></details>';
      html += '</div>';

      html += '</div>'; // compare-wrapper

      // Comparison summary
      html += '<div class="result-panel"><div class="result-title">Comparison Summary</div>';
      html += '<div class="result-info">';
      html += '<strong>Jacobi:</strong> ' + (jacobiResult.converged ? 'Converged in ' + jacobiResult.convergedAt + ' iterations' : 'Did not converge') + '<br>';
      html += '<strong>Gauss-Seidel:</strong> ' + (gsResult.converged ? 'Converged in ' + gsResult.convergedAt + ' iterations' : 'Did not converge');
      if (jacobiResult.converged && gsResult.converged) {
        html += '<br><br>';
        if (gsResult.convergedAt < jacobiResult.convergedAt) {
          html += '→ Gauss-Seidel converged <strong>' + (jacobiResult.convergedAt - gsResult.convergedAt) + ' iteration(s) faster</strong>';
        } else if (jacobiResult.convergedAt < gsResult.convergedAt) {
          html += '→ Jacobi converged <strong>' + (gsResult.convergedAt - jacobiResult.convergedAt) + ' iteration(s) faster</strong>';
        } else {
          html += '→ Both methods converged in the same number of iterations';
        }
      }
      html += '</div></div>';

      // Share
      var shareURL = buildShareURL(A, b, x0, n, 'jacobi', tol, maxIter) + '&cmp=1';
      html += '<div class="share-section">';
      html += '<input class="share-url" readonly value="' + escAttr(shareURL) + '">';
      html += '<button class="btn btn-small btn-share" onclick="copyShare(this)">Copy Link</button>';
      html += '<button class="btn btn-small btn-secondary" onclick="window.print()">Print</button>';
      html += '</div>';

      outputEl.innerHTML = html;

      addToHistory('Compare', n, A, b);
    } else {
      var result;
      if (method === 'jacobi') {
        result = jacobi(A, b, x0, n, tol, maxIter);
      } else {
        result = gaussSeidel(A, b, x0, n, tol, maxIter);
      }

      var html = '<div class="result-panel">';
      html += '<div class="result-title">' + result.method + ' Method</div>';
      html += renderResult(result, ddCheck, n, A, b, x0, tol);

      // LaTeX
      html += '<details class="latex-details"><summary>LaTeX Export</summary><div class="latex-content">';
      html += '<pre class="latex-code">' + escHTML(generateLaTeX(result, A, b, x0, n, tol, result.method)) + '</pre>';
      html += '<button class="btn btn-small btn-copy" onclick="copyLatex(this)">Copy LaTeX</button>';
      html += '</div></details>';

      // Share
      var shareURL = buildShareURL(A, b, x0, n, method, tol, maxIter);
      html += '<div class="share-section">';
      html += '<input class="share-url" readonly value="' + escAttr(shareURL) + '">';
      html += '<button class="btn btn-small btn-share" onclick="copyShare(this)">Copy Link</button>';
      html += '<button class="btn btn-small btn-secondary" onclick="window.print()">Print</button>';
      html += '</div>';

      html += '</div>';
      outputEl.innerHTML = html;

      addToHistory(result.method, n, A, b);
    }
  }

  // ===== HTML HELPERS =====
  function escHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ===== COPY FUNCTIONS (global) =====
  window.copyLatex = function (btn) {
    var pre = btn.parentElement.querySelector('.latex-code');
    navigator.clipboard.writeText(pre.textContent).then(function () {
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = orig; }, 1500);
    });
  };

  window.copyShare = function (btn) {
    var input = btn.parentElement.querySelector('.share-url');
    navigator.clipboard.writeText(input.value).then(function () {
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = orig; }, 1500);
    });
  };

  // ===== RANDOM DIAGONALLY DOMINANT MATRIX =====
  function generateRandom() {
    var n = currentSize;
    var aInputs = matrixGrid.querySelectorAll('.matrix-input');
    var bInputsEls = bVectorInputs.querySelectorAll('.matrix-input');

    for (var i = 0; i < n; i++) {
      var rowSum = 0;
      for (var j = 0; j < n; j++) {
        if (j !== i) {
          var val = Math.floor(Math.random() * 7) - 3; // -3 to 3
          aInputs[i * n + j].value = val;
          rowSum += Math.abs(val);
        }
      }
      // Make diagonal dominant
      var diagVal = rowSum + Math.floor(Math.random() * 5) + 1;
      if (Math.random() < 0.2) diagVal = -diagVal;
      aInputs[i * n + i].value = diagVal;

      bInputsEls[i].value = Math.floor(Math.random() * 21) - 10;
    }

    // Clear guess
    var gInputsEls = guessInputs.querySelectorAll('.matrix-input');
    for (var i = 0; i < n; i++) gInputsEls[i].value = '';

    outputEl.innerHTML = '';
  }

  // ===== IMPORT =====
  function importMatrix() {
    var text = importText.value.trim();
    if (!text) return;

    try {
      var rows = text.split(/[;\n]+/).map(function (r) {
        return r.trim().split(/[\s,]+/).map(Number);
      }).filter(function (r) { return r.length > 0; });

      if (rows.length < 2 || rows.length > 6) throw new Error('Need 2-6 rows');
      var n = rows.length;
      var expectCols = n + 1; // augmented [A|b]

      // If they just gave A (square), that's fine too
      var augmented = rows[0].length === n + 1;
      if (!augmented && rows[0].length !== n) throw new Error('Expected ' + n + 'x' + n + ' or ' + n + 'x' + (n + 1) + ' augmented matrix');

      sizeSelect.value = n;
      buildGrid(n);

      var aInputs = matrixGrid.querySelectorAll('.matrix-input');
      var bInputsEls = bVectorInputs.querySelectorAll('.matrix-input');

      for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
          if (isNaN(rows[i][j])) throw new Error('Invalid number at row ' + (i + 1));
          aInputs[i * n + j].value = rows[i][j];
        }
        if (augmented) {
          bInputsEls[i].value = rows[i][n];
        }
      }

      importSection.style.display = 'none';
      outputEl.innerHTML = '';
    } catch (e) {
      alert('Import error: ' + e.message);
    }
  }

  // ===== HISTORY =====
  function addToHistory(method, n, A, b) {
    var entry = {
      method: method,
      n: n,
      preview: n + '×' + n,
      A: A,
      b: b,
      time: Date.now()
    };
    history.unshift(entry);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('nc-iter-history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < history.length; i++) {
      var h = history[i];
      var date = new Date(h.time);
      var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      html += '<div class="history-item" data-idx="' + i + '">';
      html += '<div class="history-meta">';
      html += '<span class="history-method">' + h.method + '</span>';
      html += '<span class="history-size">' + h.preview + '</span>';
      html += '<span class="history-date">' + dateStr + '</span>';
      html += '</div>';
      if (h.A && h.A[0]) {
        html += '<div class="history-preview">[' + h.A[0].join(', ') + '] | b=[' + h.b.join(', ') + ']</div>';
      }
      html += '</div>';
    }
    historyList.innerHTML = html;
  }

  historyList.addEventListener('click', function (e) {
    var item = e.target.closest('.history-item');
    if (!item) return;
    var idx = parseInt(item.getAttribute('data-idx'));
    var h = history[idx];
    if (!h) return;

    sizeSelect.value = h.n;
    buildGrid(h.n);

    var aInputs = matrixGrid.querySelectorAll('.matrix-input');
    var bInputsEls = bVectorInputs.querySelectorAll('.matrix-input');

    for (var i = 0; i < h.n; i++) {
      for (var j = 0; j < h.n; j++) {
        aInputs[i * h.n + j].value = h.A[i][j];
      }
      bInputsEls[i].value = h.b[i];
    }

    if (h.method === 'Compare') {
      compareToggle.checked = true;
    } else {
      compareToggle.checked = false;
      methodSelect.value = h.method === 'Gauss-Seidel' ? 'gauss-seidel' : 'jacobi';
    }

    outputEl.innerHTML = '';
    // Close mobile panel
    historyPanel.classList.remove('open');
  });

  clearHistoryBtn.addEventListener('click', function () {
    history = [];
    localStorage.removeItem('nc-iter-history');
    renderHistory();
  });

  // ===== EVENT LISTENERS =====
  calcBtn.addEventListener('click', calculate);
  randomBtn.addEventListener('click', generateRandom);
  clearBtn.addEventListener('click', function () { outputEl.innerHTML = ''; });

  importToggleBtn.addEventListener('click', function () {
    importSection.style.display = importSection.style.display === 'none' ? 'block' : 'none';
  });

  importBtn.addEventListener('click', importMatrix);

  historyToggle.addEventListener('click', function () {
    historyPanel.classList.toggle('open');
  });

  // Ctrl+Enter to calculate
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      calculate();
    }
  });

  // ===== INIT =====
  initTheme();
  buildGrid(3);
  renderHistory();

  // Load from URL if present
  if (loadFromURL()) {
    setTimeout(calculate, 100);
  }

})();
