import React, { useEffect, useMemo, useRef, useState } from "react";

// Página única e auto-contida para demonstrar modulação ASK, FSK, BPSK, QPSK e 16-QAM
// - Controles (frequência portadora, taxa de símbolos, ruído, desvio FSK, amplitude)
// - Visualizações: bits baseband, sinal no tempo, constelação (amostrada por símbolo)
// - Implementação via Canvas para performance e simplicidade
// - Sem bibliotecas externas; estilização com classes utilitárias (Tailwind opcional no host)

// Utilidades matemáticas
function gaussRand() {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function linspace(start, end, n) {
  const arr = new Array(n);
  const step = (end - start) / (n - 1);
  for (let i = 0; i < n; i++) arr[i] = start + i * step;
  return arr;
}

function mapRange(x, inMin, inMax, outMin, outMax) {
  return outMin + ((x - inMin) * (outMax - outMin)) / (inMax - inMin);
}

// Mapeamentos de símbolos
function grayBitsToQPSK(bits2) {
  // Gray: 00->(1,1); 01->(-1,1); 11->(-1,-1); 10->(1,-1)
  const [b0, b1] = bits2;
  if (b0 === 0 && b1 === 0) return [1, 1];
  if (b0 === 0 && b1 === 1) return [-1, 1];
  if (b0 === 1 && b1 === 1) return [-1, -1];
  return [1, -1];
}

function bits4To16QAM(bits4) {
  // Gray (por eixo): 00->+3, 01->+1, 11->-1, 10->-3
  const map2Gray = (b0, b1) => {
    if (b0 === 0 && b1 === 0) return 3;
    if (b0 === 0 && b1 === 1) return 1;
    if (b0 === 1 && b1 === 1) return -1;
    return -3;
  };
  const I = map2Gray(bits4[0], bits4[1]);
  const Q = map2Gray(bits4[2], bits4[3]);
  // normalização para potência média unitarizada (sqrt(10))
  const norm = 1 / Math.sqrt(10);
  return [I * norm, Q * norm];
}

// Geração de bits
function generateBits(n) {
  return Array.from({ length: n }, () => (Math.random() < 0.5 ? 0 : 1));
}

function chunkBits(bits, size) {
  const out = [];
  for (let i = 0; i < bits.length; i += size) {
    const slice = bits.slice(i, i + size);
    if (slice.length === size) out.push(slice);
  }
  return out;
}

// Demodulação coerente simples por símbolo (correlator)
function correlateIQ(signal, t, fc, sps, symCount) {
  const I = new Array(symCount).fill(0);
  const Q = new Array(symCount).fill(0);
  const Ts = sps; // amostras por símbolo
  for (let k = 0; k < symCount; k++) {
    let accI = 0;
    let accQ = 0;
    const start = k * Ts;
    const end = start + Ts;
    for (let n = start; n < end && n < signal.length; n++) {
      const c = Math.cos(2 * Math.PI * fc * t[n]);
      const s = Math.sin(2 * Math.PI * fc * t[n]);
      accI += signal[n] * c;
      accQ += -signal[n] * s; // nota o sinal para Q (convencional s(t)=I cos - Q sin)
    }
    I[k] = accI / Ts;
    Q[k] = accQ / Ts;
  }
  return { I, Q };
}

function useResizeObserver(ref, cb) {
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => cb());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, cb]);
}

function Plot({ data, color = "#111827", label = "", height = 160, yRange = [-1, 1] }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const parent = wrapRef.current;
    if (!canvas || !parent) return;
    const width = parent.clientWidth;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // eixo
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    // zero horizontal
    const y0 = mapRange(0, yRange[0], yRange[1], height - 10, 10);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(width, y0);
    ctx.stroke();

    // série
    if (!data || data.length === 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * (width - 20) + 10;
      const y = mapRange(data[i], yRange[0], yRange[1], height - 10, 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // label
    if (label) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px sans-serif";
      ctx.fillText(label, 10, 14);
    }
  };

  useEffect(draw, [data, height, yRange]);
  useResizeObserver(wrapRef, draw);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="w-full rounded-2xl shadow" />
    </div>
  );
}

function StairsBits({ bits, height = 80 }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const parent = wrapRef.current;
    if (!canvas || !parent) return;
    const width = parent.clientWidth;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    const n = bits.length;
    const stepW = (width - 20) / n;
    const y0 = height - 20;
    const y1 = 20;

    // grade
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, y0);
    ctx.lineTo(width - 10, y0);
    ctx.moveTo(10, y1);
    ctx.lineTo(width - 10, y1);
    ctx.stroke();

    // degraus
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();

    let x = 10;
    let y = bits[0] ? y1 : y0;
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      const nextY = bits[i] ? y1 : y0;
      ctx.lineTo(x + stepW, y);
      ctx.lineTo(x + stepW, nextY);
      x += stepW;
      y = nextY;
    }
    ctx.stroke();

    // rótulos
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.fillText("0", 4, y0 + 4);
    ctx.fillText("1", 4, y1 + 4);
  };

  useEffect(draw, [bits, height]);
  useResizeObserver(wrapRef, draw);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="w-full rounded-2xl shadow" />
    </div>
  );
}

function Constellation({ I, Q, height = 260, title = "Constelação" }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const parent = wrapRef.current;
    if (!canvas || !parent) return;
    const width = parent.clientWidth;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // sistema de eixos centrado
    const cx = width / 2;
    const cy = height / 2;
    const margin = 20;
    const scale = Math.min(cx, cy) - margin;

    // eixos
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, cy);
    ctx.lineTo(width - margin, cy);
    ctx.moveTo(cx, margin);
    ctx.lineTo(cx, height - margin);
    ctx.stroke();

    // pontos
    ctx.fillStyle = "#111827";
    for (let k = 0; k < I.length; k++) {
      const x = cx + I[k] * scale;
      const y = cy - Q[k] * scale;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // grade leve
    ctx.strokeStyle = "#f3f4f6";
    ctx.beginPath();
    for (let v of [-0.5, 0.5]) {
      ctx.moveTo(cx + v * scale, margin);
      ctx.lineTo(cx + v * scale, height - margin);
      ctx.moveTo(margin, cy + v * scale);
      ctx.lineTo(width - margin, cy + v * scale);
    }
    ctx.stroke();

    // título
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.fillText(title, 10, 14);
  };

  useEffect(draw, [I, Q, height]);
  useResizeObserver(wrapRef, draw);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="w-full rounded-2xl shadow" />
    </div>
  );
}

export default function WirelessModulationPlayground() {
  const [mod, setMod] = useState("BPSK"); // ASK | FSK | BPSK | QPSK | QAM16
  const [bitsN, setBitsN] = useState(40);
  const [bits, setBits] = useState(generateBits(40));
  const [fc, setFc] = useState(400); // Hz
  const [symRate, setSymRate] = useState(20); // símbolos/s
  const [amp, setAmp] = useState(1.0);
  const [noise, setNoise] = useState(0);
  const [fskDev, setFskDev] = useState(150); // Hz
  const [sps, setSps] = useState(100); // amostras por símbolo

  // Parâmetros derivados
  const Fs = useMemo(() => symRate * sps, [symRate, sps]);
  const symCount = useMemo(() => {
    if (mod === "QPSK") return Math.floor(bits.length / 2);
    if (mod === "QAM16") return Math.floor(bits.length / 4);
    return bits.length;
  }, [bits.length, mod]);

  const { t, signal, baseband, IQperSymbol } = useMemo(() => {
    // tempo total = symCount * Ts
    const bitsUsed = (() => {
      if (mod === "QPSK") return bits.slice(0, Math.floor(bits.length / 2) * 2);
      if (mod === "QAM16") return bits.slice(0, Math.floor(bits.length / 4) * 4);
      return bits;
    })();

    const bitsPerSymbol = mod === "QAM16" ? 4 : mod === "QPSK" ? 2 : 1;
    const symbols = chunkBits(bitsUsed, bitsPerSymbol);

    const Nsym = symbols.length;
    const N = Nsym * sps;
    const dt = 1 / (symRate * sps);
    const t = new Array(N);
    const s = new Array(N).fill(0);
    const base = new Array(N).fill(0);

    const IQperSymbol = [];

    for (let k = 0; k < Nsym; k++) {
      const start = k * sps;
      const end = start + sps;

      let I = 0, Q = 0;
      if (mod === "ASK") {
        const a = symbols[k][0] === 1 ? amp : 0; // OOK
        for (let n = start; n < end; n++) {
          const tn = (n - start) / Fs + k / symRate;
          t[n] = tn;
          s[n] = a * Math.cos(2 * Math.PI * fc * tn);
          base[n] = symbols[k][0] ? 1 : 0;
        }
        I = a; Q = 0;
      } else if (mod === "FSK") {
        const f = symbols[k][0] === 1 ? fc + fskDev : fc - fskDev;
        for (let n = start; n < end; n++) {
          const tn = (n - start) / Fs + k / symRate;
          t[n] = tn;
          s[n] = amp * Math.cos(2 * Math.PI * f * tn);
          base[n] = symbols[k][0] ? 1 : 0;
        }
        // Para constelação de FSK não é canônico; omitimos IQ coerente aqui
        I = 0; Q = 0;
      } else if (mod === "BPSK") {
        const phase = symbols[k][0] === 1 ? 0 : Math.PI; // 1 -> 0°, 0 -> 180°
        for (let n = start; n < end; n++) {
          const tn = (n - start) / Fs + k / symRate;
          t[n] = tn;
          s[n] = amp * Math.cos(2 * Math.PI * fc * tn + phase);
          base[n] = symbols[k][0] ? 1 : 0;
        }
        I = symbols[k][0] ? amp : -amp; Q = 0;
      } else if (mod === "QPSK") {
        const [I0, Q0] = grayBitsToQPSK(symbols[k]);
        for (let n = start; n < end; n++) {
          const tn = (n - start) / Fs + k / symRate;
          t[n] = tn;
          s[n] = amp * (I0 * Math.cos(2 * Math.PI * fc * tn) - Q0 * Math.sin(2 * Math.PI * fc * tn));
          base[n] = 0; // apenas decorativo
        }
        I = I0 * amp; Q = Q0 * amp;
      } else if (mod === "QAM16") {
        const [I0, Q0] = bits4To16QAM(symbols[k]);
        for (let n = start; n < end; n++) {
          const tn = (n - start) / Fs + k / symRate;
          t[n] = tn;
          s[n] = amp * (I0 * Math.cos(2 * Math.PI * fc * tn) - Q0 * Math.sin(2 * Math.PI * fc * tn));
          base[n] = 0;
        }
        I = I0 * amp; Q = Q0 * amp;
      }
      IQperSymbol.push([I, Q]);
    }

    // Ruído AWGN
    if (noise > 0) {
      for (let i = 0; i < s.length; i++) s[i] += noise * gaussRand();
    }

    return { t, signal: s, baseband: base, IQperSymbol };
  }, [bits, amp, fc, symRate, sps, noise, mod, fskDev]);

  // Estimativa de constelação via correlação coerente (não aplicável a FSK classicamente)
  const { I, Q } = useMemo(() => {
    if (mod === "FSK") {
      // Para FSK mostramos pontos vazios (ou zero) — alternativa: esconder.
      return { I: [], Q: [] };
    }
    const Nsym = Math.floor(signal.length / sps);
    const tAxis = linspace(0, Nsym / symRate, signal.length);
    return correlateIQ(signal, tAxis, fc, sps, Nsym);
  }, [signal, fc, sps, symRate, mod]);

  // Helpers UI
  const regenerate = () => setBits(generateBits(bitsN));

  useEffect(() => {
    // Ajusta quantidade de bits ao mudar modulação
    const bps = mod === "QAM16" ? 4 : mod === "QPSK" ? 2 : 1;
    const m = Math.max(1, Math.floor(bitsN / bps) * bps);
    if (m !== bits.length) setBits(generateBits(m));
  }, [mod]);

  // Paleta mínima
  const text = "text-gray-900";
  const sub = "text-gray-500";
  const card = "rounded-2xl shadow p-4 bg-white";
  const grid = "grid grid-cols-1 lg:grid-cols-3 gap-4";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold \n            bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Playground Interativo de Modulação (ASK, FSK, BPSK, QPSK, 16-QAM)
          </h1>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); regenerate(); }}
            className="text-sm md:text-base underline"
            title="Gerar novos bits"
          >
            Gerar novos bits
          </a>
        </header>

        {/* Controles */}
        <section className={card}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`${sub} text-xs`}>Modulação</label>
              <select
                className="w-full mt-1 p-2 rounded-xl border border-gray-200"
                value={mod}
                onChange={(e) => setMod(e.target.value)}
              >
                <option>ASK</option>
                <option>FSK</option>
                <option>BPSK</option>
                <option>QPSK</option>
                <option>QAM16</option>
              </select>
            </div>

            <div>
              <label className={`${sub} text-xs`}>Frequência da portadora (Hz): {fc}</label>
              <input
                type="range" min={100} max={2000} step={10}
                className="w-full"
                value={fc}
                onChange={(e) => setFc(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className={`${sub} text-xs`}>Taxa de símbolos (símb/s): {symRate}</label>
              <input
                type="range" min={5} max={100} step={1}
                className="w-full"
                value={symRate}
                onChange={(e) => setSymRate(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className={`${sub} text-xs`}>Amplitude: {amp.toFixed(2)}</label>
              <input
                type="range" min={0.2} max={2.0} step={0.05}
                className="w-full"
                value={amp}
                onChange={(e) => setAmp(parseFloat(e.target.value))}
              />
            </div>

            {mod === "FSK" && (
              <div>
                <label className={`${sub} text-xs`}>Desvio de frequência FSK (Hz): {fskDev}</label>
                <input
                  type="range" min={20} max={600} step={10}
                  className="w-full"
                  value={fskDev}
                  onChange={(e) => setFskDev(parseInt(e.target.value))}
                />
              </div>
            )}

            <div>
              <label className={`${sub} text-xs`}>Ruído (desvio padrão): {noise.toFixed(2)}</label>
              <input
                type="range" min={0} max={0.8} step={0.02}
                className="w-full"
                value={noise}
                onChange={(e) => setNoise(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <label className={`${sub} text-xs`}>Amostras por símbolo: {sps}</label>
              <input
                type="range" min={40} max={200} step={5}
                className="w-full"
                value={sps}
                onChange={(e) => setSps(parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className={`${sub} text-xs`}>Quantidade de bits: {bitsN}</label>
              <input
                type="range" min={16} max={200} step={4}
                className="w-full"
                value={bitsN}
                onChange={(e) => { setBitsN(parseInt(e.target.value)); setBits(generateBits(parseInt(e.target.value))); }}
              />
            </div>
          </div>

          <p className={`${sub} text-xs mt-3`}>
            Dica: aumente a taxa de símbolos ou o ruído para observar espalhamento na constelação e
            degradação do sinal no tempo. Em FSK, a constelação é omitida pois a informação está na frequência.
          </p>
        </section>

        {/* Visualizações */}
        <section className={grid}>
          <div className={card}>
            <h3 className={`${text} font-semibold mb-2`}>Bits (baseband)</h3>
            <StairsBits bits={bits} height={100} />
          </div>

          <div className={`lg:col-span-2 ${card}`}>
            <h3 className={`${text} font-semibold mb-2`}>Sinal Modulado (tempo)</h3>
            {/* Limita yRange para visualização agradável */}
            <Plot
              data={signal.slice(0, Math.min(signal.length, 5000))}
              height={220}
              yRange={[-Math.max(1.2, amp * 2), Math.max(1.2, amp * 2)]}
              label={`fc=${fc} Hz, Rs=${symRate} sym/s`}
            />
          </div>
        </section>

        <section className={grid}>
          <div className={`lg:col-span-2 ${card}`}>
            <h3 className={`${text} font-semibold mb-2`}>Constelação (amostrada por símbolo)</h3>
            {mod === "FSK" ? (
              <div className="text-sm text-gray-500">FSK não possui constelação I/Q coerente típica — a informação está na frequência. Use o gráfico temporal para observar as duas frequências.</div>
            ) : (
              <Constellation I={I} Q={Q} height={300} />
            )}
          </div>

          <div className={card}>
            <h3 className={`${text} font-semibold mb-2`}>Símbolos (I/Q esperados)</h3>
            <div className="text-sm text-gray-600 max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left pr-2">#</th>
                    <th className="text-left pr-2">Bits</th>
                    <th className="text-left pr-2">I</th>
                    <th className="text-left pr-2">Q</th>
                  </tr>
                </thead>
                <tbody>
                  {IQperSymbol.slice(0, 200).map((v, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="pr-2">{idx}</td>
                      <td className="pr-2">
                        {(() => {
                          const bps = mod === "QAM16" ? 4 : mod === "QPSK" ? 2 : 1;
                          const start = idx * bps;
                          return bits.slice(start, start + bps).join("");
                        })()}
                      </td>
                      <td className="pr-2">{v[0].toFixed(2)}</td>
                      <td className="pr-2">{v[1].toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="text-xs text-gray-500 pt-2">
          <p>
            Observações: BPSK usa fase 0/π; QPSK com mapeamento Gray; 16-QAM normalizada por √10.
            A constelação é estimada por correlação coerente cos/sin por símbolo. Em FSK binária, a
            informação é codificada em duas frequências (fc±Δf), por isso omitimos a constelação I/Q.
          </p>
        </footer>
      </div>
    </div>
  );
}
