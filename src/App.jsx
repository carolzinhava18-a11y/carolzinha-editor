import { useState, useEffect, useRef, useCallback } from "react";

const CLIENT_ID = "137620209025-duqstlc8jf144f1ac90bfs8gv6o2jkor.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive";

const MOODS = [
  { id: "romantico", label: "Romântico", emoji: "🌹", desc: "Suave, quente, intimista" },
  { id: "energetico", label: "Enérgico", emoji: "⚡", desc: "Rápido, vibrante, impactante" },
  { id: "cinematico", label: "Cinemático", emoji: "🎬", desc: "Dramático, profundo, épico" },
  { id: "alegre", label: "Alegre", emoji: "🎉", desc: "Leve, colorido, festivo" },
  { id: "elegante", label: "Elegante", emoji: "✨", desc: "Clean, sofisticado, refinado" },
  { id: "nostalgico", label: "Nostálgico", emoji: "🎞", desc: "Vintage, cálido, emocional" },
];

const EVENTS = [
  { id: "casamento", label: "Casamento", icon: "💍" },
  { id: "aniversario", label: "Aniversário", icon: "🎂" },
  { id: "quincea", label: "Quinceañera", icon: "👑" },
  { id: "corporativo", label: "Corporativo", icon: "🏢" },
  { id: "formatura", label: "Formatura", icon: "🎓" },
  { id: "outro", label: "Outro", icon: "🎬" },
];

const COLOR_GRADES = [
  { id: "natural", label: "Natural", color: "#D4A76A" },
  { id: "frio", label: "Frio & Azulado", color: "#6A9FD4" },
  { id: "quente", label: "Quente & Âmbar", color: "#D46A1A" },
  { id: "desaturado", label: "Desaturado", color: "#9A9A9A" },
  { id: "verde", label: "Verde Cinemático", color: "#4A8C6A" },
  { id: "rosado", label: "Rosado & Pastel", color: "#D46A8C" },
];

const FORMATS = [
  { id: "reel", label: "Reel", ratio: "9:16", icon: "📱" },
  { id: "aftermovie", label: "Aftermovie", ratio: "16:9", icon: "🖥" },
  { id: "ambos", label: "Ambos", ratio: "9:16 + 16:9", icon: "✦" },
];

function useDrive() {
  const [user, setUser] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState("");
  const tokenClientRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    if (document.getElementById("gis-script")) { tryInit(); return; }
    const s = document.createElement("script");
    s.id = "gis-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = tryInit;
    document.head.appendChild(s);
  }, []);

  const tryInit = () => {
    const attempt = () => {
      if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: handleToken,
        });
      } else {
        setTimeout(attempt, 300);
      }
    };
    attempt();
  };

  const handleToken = useCallback(async (resp) => {
    if (resp.error) { setDriveError("Erro ao autenticar."); return; }
    tokenRef.current = resp.access_token;
    try {
      const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${resp.access_token}` }
      });
      const info = await r.json();
      setUser({ name: info.name, email: info.email, picture: info.picture });
      setDriveError("");
    } catch { setDriveError("Não foi possível obter os dados do usuário."); }
  }, []);

  const signIn = () => {
    setDriveError("");
    if (!tokenClientRef.current) { setDriveError("Google ainda carregando. Tente em 2s."); return; }
    tokenClientRef.current.requestAccessToken();
  };

  const signOut = () => {
    if (tokenRef.current) window.google?.accounts.oauth2.revoke(tokenRef.current);
    tokenRef.current = null;
    setUser(null);
    setDriveFiles([]);
  };

  const listVideoFiles = useCallback(async () => {
    if (!tokenRef.current) { setDriveError("Faça login primeiro."); return; }
    setDriveLoading(true);
    setDriveError("");
    try {
      const q = `mimeType contains 'video/' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,mimeType,modifiedTime)&pageSize=50&orderBy=modifiedTime desc`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      const data = await r.json();
      setDriveFiles(data.files || []);
      if (!data.files?.length) setDriveError("Nenhum vídeo encontrado no Drive.");
    } catch { setDriveError("Erro ao listar arquivos."); }
    finally { setDriveLoading(false); }
  }, []);

  return { user, signIn, signOut, driveFiles, driveLoading, driveError, listVideoFiles };
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [selectedDriveFiles, setSelectedDriveFiles] = useState([]);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [form, setForm] = useState({
    evento: "", clientName: "", mood: "", colorGrade: "",
    formato: "", musica: "", duracao: "60", obs: "",
  });
  const intervalRef = useRef(null);
  const drive = useDrive();

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDriveFile = (file) =>
    setSelectedDriveFiles(prev =>
      prev.find(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );

  const startProcessing = () => {
    setScreen("processing");
    const steps = [
      [0,"Analisando clipes..."],
      [15,"Detectando cenas e rostos..."],
      [30,"Realizando cortes automáticos..."],
      [48,"Aplicando color grade..."],
      [62,"Gerando legendas com IA..."],
      [75,"Sincronizando música..."],
      [88,"Exportando formatos..."],
      [96,"Subindo para o Drive..."],
      [100,"Pronto! 🎬"],
    ];
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (i < steps.length) { setProgress(steps[i][0]); setProgressLabel(steps[i][1]); i++; }
      else { clearInterval(intervalRef.current); setTimeout(() => setScreen("result"), 800); }
    }, 900);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const canNext = () => {
    if (step===1) return form.evento && form.clientName;
    if (step===2) return form.mood;
    if (step===3) return form.colorGrade;
    if (step===4) return form.formato;
    return true;
  };

  const fmt = (b) => { if(!b) return "—"; const mb=parseInt(b)/1048576; return mb>1?`${mb.toFixed(0)}MB`:`${(parseInt(b)/1024).toFixed(0)}KB`; };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#080808;--surface:#111;--s2:#1A1A1A;--bd:rgba(255,255,255,0.07);--ac:#FF5C3A;--ac2:#FFB547;--tx:#F0EDE8;--mu:#7A7570;--ok:#4ADE80}
        body{background:var(--bg);color:var(--tx);font-family:'DM Sans',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
        .app{max-width:430px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}

        /* HOME */
        .home{flex:1;display:flex;flex-direction:column}
        .home-hero{padding:56px 28px 20px;position:relative}
        .home-grain{position:absolute;inset:0;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");pointer-events:none}
        .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,92,58,.12);border:1px solid rgba(255,92,58,.25);border-radius:100px;padding:5px 12px;font-size:11px;font-weight:500;color:var(--ac);letter-spacing:.08em;text-transform:uppercase;margin-bottom:18px}
        .badge::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--ac);animation:pulse 2s ease infinite}
        .home-title{font-family:'Syne',sans-serif;font-size:40px;font-weight:800;line-height:1.05;letter-spacing:-.02em;margin-bottom:10px}
        .home-title span{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .home-sub{font-size:14px;color:var(--mu);line-height:1.6;max-width:270px}

        /* Drive card */
        .drive-card{margin:16px 28px;background:var(--surface);border:1px solid var(--bd);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px}
        .d-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .d-avatar-ph{width:38px;height:38px;border-radius:50%;background:var(--s2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .d-info{flex:1}
        .d-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:700}
        .d-sub{font-size:11px;color:var(--mu)}
        .d-btn{padding:8px 14px;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:none;white-space:nowrap}
        .d-btn.on{background:rgba(255,92,58,.15);color:var(--ac);border:1px solid rgba(255,92,58,.3)}
        .d-btn.off{background:var(--s2);color:var(--mu);border:1px solid var(--bd)}

        .home-vis{margin:0 28px;height:170px;border-radius:16px;background:var(--surface);border:1px solid var(--bd);overflow:hidden;position:relative;display:flex;align-items:flex-end;padding:16px;gap:8px}
        .tbar{flex:1;border-radius:4px;position:relative;overflow:hidden}
        .tbar::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.08) 0%,transparent 100%)}
        .vis-lbl{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-size:10px;color:var(--mu);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 28px}
        .stat{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:13px 10px;text-align:center}
        .stat-n{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;color:var(--ac);line-height:1;margin-bottom:3px}
        .stat-l{font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:.05em}
        .home-cta{padding:0 28px 36px;margin-top:auto;display:flex;flex-direction:column;gap:10px}

        /* BUTTONS */
        .btn-p{width:100%;padding:16px;background:linear-gradient(135deg,var(--ac),#FF8C6A);border:none;border-radius:14px;color:#fff;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:all .2s;box-shadow:0 8px 32px rgba(255,92,58,.28)}
        .btn-p:hover{transform:translateY(-1px);box-shadow:0 12px 40px rgba(255,92,58,.38)}
        .btn-p:active{transform:translateY(0)}
        .btn-p:disabled{opacity:.4;cursor:not-allowed;transform:none}
        .btn-s{width:100%;padding:15px;background:transparent;border:1px solid var(--bd);border-radius:14px;color:var(--mu);font-size:14px;cursor:pointer;transition:all .2s}
        .btn-s:hover{border-color:rgba(255,255,255,.15);color:var(--tx)}

        /* BRIEFING */
        .briefing{flex:1;display:flex;flex-direction:column}
        .b-header{padding:52px 28px 22px;border-bottom:1px solid var(--bd)}
        .steps{display:flex;gap:6px;margin-bottom:18px}
        .sdot{height:3px;border-radius:2px;flex:1;background:var(--s2);transition:background .3s}
        .sdot.a{background:var(--ac)}.sdot.d{background:rgba(255,92,58,.4)}
        .s-lbl{font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}
        .s-title{font-family:'Syne',sans-serif;font-size:25px;font-weight:800;line-height:1.1}
        .b-body{flex:1;padding:22px 28px;overflow-y:auto}
        .flbl{font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.08em;margin-bottom:9px;margin-top:18px;display:block}
        .flbl:first-child{margin-top:0}
        .finp{width:100%;background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;color:var(--tx);font-size:14px;outline:none;transition:border-color .2s;font-family:'DM Sans',sans-serif}
        .finp:focus{border-color:rgba(255,92,58,.5)}.finp::placeholder{color:var(--mu)}
        textarea.finp{resize:none;min-height:78px}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px}
        .ocard{background:var(--surface);border:1.5px solid var(--bd);border-radius:14px;padding:13px 10px;cursor:pointer;transition:all .2s;text-align:center}
        .ocard:hover{border-color:rgba(255,92,58,.3)}.ocard.sel{border-color:var(--ac);background:rgba(255,92,58,.07)}
        .oico{font-size:21px;margin-bottom:5px}.olbl{font-size:11px;font-weight:600;color:var(--tx);font-family:'Syne',sans-serif;margin-bottom:2px}
        .odsc{font-size:10px;color:var(--mu);line-height:1.4}
        .cswatch{width:100%;height:38px;border-radius:8px;margin-bottom:7px;border:2px solid transparent}
        .ocard.sel .cswatch{border-color:#fff}
        .fcard{background:var(--surface);border:1.5px solid var(--bd);border-radius:14px;padding:15px 10px;cursor:pointer;transition:all .2s;text-align:center}
        .fcard.sel{border-color:var(--ac);background:rgba(255,92,58,.07)}
        .fico{font-size:26px;margin-bottom:7px}.flb{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;margin-bottom:3px}
        .frat{font-size:10px;color:var(--mu);background:var(--s2);padding:2px 7px;border-radius:100px;display:inline-block}
        .dur-row{display:flex;gap:7px}
        .dbtn{flex:1;padding:9px;background:var(--surface);border:1.5px solid var(--bd);border-radius:10px;color:var(--tx);font-size:12px;cursor:pointer;transition:all .2s;text-align:center;font-family:'DM Sans',sans-serif}
        .dbtn.a{border-color:var(--ac);color:var(--ac);background:rgba(255,92,58,.07)}
        .b-footer{padding:14px 28px 34px;border-top:1px solid var(--bd);display:flex;gap:10px}
        .btn-bk{width:46px;height:46px;background:var(--surface);border:1px solid var(--bd);border-radius:12px;color:var(--mu);font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
        .btn-bk:hover{color:var(--tx);border-color:rgba(255,255,255,.15)}

        /* Upload */
        .upzone{margin:18px 0;border:1.5px dashed rgba(255,92,58,.3);border-radius:16px;padding:32px 22px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,92,58,.03)}
        .upzone:hover{border-color:var(--ac);background:rgba(255,92,58,.06)}
        .up-ico{font-size:34px;margin-bottom:10px}.up-t{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:5px}.up-s{font-size:12px;color:var(--mu)}
        .di-btn{width:100%;padding:13px;background:var(--surface);border:1px solid var(--bd);border-radius:14px;color:var(--tx);font-size:13px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:all .2s;margin-bottom:9px;font-family:'DM Sans',sans-serif}
        .di-btn:hover{border-color:rgba(255,255,255,.15)}.di-btn:disabled{opacity:.4;cursor:not-allowed}
        .di-ico{width:27px;height:27px;border-radius:6px;background:linear-gradient(135deg,#4285F4,#34A853,#FBBC04,#EA4335);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .flist{display:flex;flex-direction:column;gap:7px;margin-top:10px}
        .fitem{background:var(--surface);border:1px solid var(--bd);border-radius:10px;padding:9px 13px;display:flex;align-items:center;gap:9px;font-size:12px}
        .fn{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fs{color:var(--mu);font-size:10px;flex-shrink:0}
        .note{background:rgba(255,181,71,.07);border:1px solid rgba(255,181,71,.2);border-radius:11px;padding:11px 13px;font-size:12px;color:#FFB547;margin-bottom:11px;line-height:1.5}

        /* DRIVE PICKER */
        .picker{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;background:var(--bg);max-width:430px;margin:0 auto}
        .pk-hdr{padding:50px 28px 14px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:13px}
        .pk-t{font-family:'Syne',sans-serif;font-size:19px;font-weight:800;flex:1}
        .pk-cls{width:34px;height:34px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--mu);transition:all .2s}
        .pk-cls:hover{color:var(--tx)}
        .pk-body{flex:1;overflow-y:auto;padding:14px 28px}
        .pk-file{display:flex;align-items:center;gap:11px;padding:11px 13px;background:var(--surface);border:1.5px solid var(--bd);border-radius:12px;cursor:pointer;transition:all .2s;margin-bottom:7px}
        .pk-file:hover{border-color:rgba(255,92,58,.3)}.pk-file.sel{border-color:var(--ac);background:rgba(255,92,58,.06)}
        .pk-fi{font-size:19px;flex-shrink:0}.pk-inf{flex:1;min-width:0}
        .pk-fn{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pk-fm{font-size:10px;color:var(--mu);margin-top:2px}
        .pk-ck{width:21px;height:21px;border-radius:50%;border:1.5px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;transition:all .2s}
        .pk-file.sel .pk-ck{background:var(--ac);border-color:var(--ac);color:#fff}
        .pk-ft{padding:14px 28px 34px;border-top:1px solid var(--bd)}
        .pk-cnt{font-size:12px;color:var(--mu);text-align:center;margin-bottom:11px}
        .pk-cnt span{color:var(--ac);font-weight:600}
        .pk-emp{text-align:center;padding:36px 0;color:var(--mu);font-size:13px}
        .green-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:100px;padding:3px 9px;font-size:10px;color:var(--ok)}
        .green-badge::before{content:'';width:5px;height:5px;border-radius:50%;background:var(--ok)}

        /* PROCESSING */
        .proc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 28px}
        .ring{width:138px;height:138px;position:relative;margin-bottom:32px}
        .ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
        .ring-t{fill:none;stroke:var(--s2);stroke-width:6}.ring-f{fill:none;stroke:url(#rg);stroke-width:6;stroke-linecap:round;transition:stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)}
        .ring-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .ring-pct{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;line-height:1;background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .proc-t{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;text-align:center;margin-bottom:7px}
        .proc-l{font-size:13px;color:var(--mu);text-align:center;margin-bottom:28px;min-height:20px}
        .psteps{width:100%;display:flex;flex-direction:column;gap:7px}
        .pstep{display:flex;align-items:center;gap:9px;padding:9px 13px;background:var(--surface);border:1px solid var(--bd);border-radius:10px;font-size:12px;color:var(--mu);transition:all .4s}
        .pstep.done{color:var(--tx);border-color:rgba(74,222,128,.2)}.pstep.act{color:var(--ac);border-color:rgba(255,92,58,.3);background:rgba(255,92,58,.04)}
        .pdot{width:7px;height:7px;border-radius:50%;background:var(--s2);flex-shrink:0;transition:background .3s}
        .pstep.done .pdot{background:var(--ok)}.pstep.act .pdot{background:var(--ac);animation:pulse 1s ease infinite}

        /* RESULT */
        .result{flex:1;display:flex;flex-direction:column}
        .r-hdr{padding:50px 28px 22px;text-align:center}
        .r-ck{width:62px;height:62px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px}
        .r-t{font-family:'Syne',sans-serif;font-size:27px;font-weight:800;margin-bottom:5px}.r-s{font-size:13px;color:var(--mu)}
        .r-body{flex:1;padding:0 28px;overflow-y:auto}
        .r-prev{background:var(--surface);border:1px solid var(--bd);border-radius:16px;overflow:hidden;margin-bottom:14px}
        .prev-th{width:100%;height:175px;background:linear-gradient(135deg,#1A1A1A,#222);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
        .prev-th::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,92,58,.1),rgba(255,181,71,.05))}
        .prev-play{width:54px;height:54px;background:rgba(255,255,255,.1);backdrop-filter:blur(8px);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;position:relative;z-index:1;cursor:pointer;transition:all .2s;border:1px solid rgba(255,255,255,.15)}
        .prev-play:hover{background:rgba(255,92,58,.3);transform:scale(1.08)}
        .prev-info{padding:13px 15px;display:flex;justify-content:space-between;align-items:center}
        .prev-n{font-family:'Syne',sans-serif;font-size:13px;font-weight:700}.prev-m{font-size:11px;color:var(--mu)}
        .outs{display:flex;flex-direction:column;gap:7px;margin-bottom:18px}
        .oitem{background:var(--surface);border:1px solid var(--bd);border-radius:12px;padding:13px 15px;display:flex;align-items:center;gap:11px}
        .oico2{width:34px;height:34px;background:rgba(255,92,58,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .oi{flex:1}.on{font-size:13px;font-weight:500;margin-bottom:1px}.od{font-size:10px;color:var(--mu)}
        .odl{width:31px;height:31px;background:var(--s2);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;transition:all .2s;border:1px solid var(--bd)}
        .odl:hover{background:rgba(255,92,58,.15);border-color:rgba(255,92,58,.3)}
        .r-ft{padding:14px 28px 38px;display:flex;flex-direction:column;gap:9px;border-top:1px solid var(--bd)}
        .divider{text-align:center;font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;gap:11px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--bd)}
      `}</style>

      <div className="app">

        {/* ── DRIVE PICKER ── */}
        {showDrivePicker && (
          <div className="picker">
            <div className="pk-hdr">
              <div>
                <div className="pk-t">Google Drive</div>
                {drive.user && <div className="green-badge">{drive.user.email}</div>}
              </div>
              <div className="pk-cls" onClick={() => setShowDrivePicker(false)}>✕</div>
            </div>

            <div className="pk-body">
              {!drive.user ? (
                <div style={{textAlign:"center",padding:"40px 0"}}>
                  <div style={{fontSize:38,marginBottom:14}}>▲</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,marginBottom:7}}>Conectar ao Drive</div>
                  <div style={{fontSize:13,color:"var(--mu)",marginBottom:22}}>Faça login com o Google para acessar seus vídeos</div>
                  <button className="btn-p" style={{maxWidth:220,margin:"0 auto"}} onClick={drive.signIn}>Entrar com Google</button>
                  {drive.driveError && <div style={{color:"#f87171",fontSize:12,marginTop:12}}>{drive.driveError}</div>}
                </div>
              ) : (
                <>
                  <button
                    className="di-btn"
                    style={{background:"rgba(255,92,58,.08)",borderColor:"rgba(255,92,58,.25)",color:"var(--ac)",marginBottom:14}}
                    onClick={drive.listVideoFiles}
                    disabled={drive.driveLoading}
                  >
                    <span>🔍</span>
                    {drive.driveLoading ? "Buscando vídeos..." : "Buscar vídeos no Drive"}
                  </button>

                  {drive.driveError && <div style={{color:"#f87171",fontSize:12,marginBottom:11}}>{drive.driveError}</div>}

                  {drive.driveLoading && <div className="pk-emp">🔍 Buscando...</div>}

                  {!drive.driveLoading && drive.driveFiles.length === 0 && !drive.driveError && (
                    <div className="pk-emp">
                      <div style={{fontSize:30,marginBottom:8}}>🎬</div>
                      Clique em "Buscar vídeos" para listar seus arquivos
                    </div>
                  )}

                  {drive.driveFiles.map(file => {
                    const isSel = selectedDriveFiles.find(f => f.id === file.id);
                    return (
                      <div key={file.id} className={`pk-file ${isSel ? "sel" : ""}`} onClick={() => toggleDriveFile(file)}>
                        <div className="pk-fi">🎞</div>
                        <div className="pk-inf">
                          <div className="pk-fn">{file.name}</div>
                          <div className="pk-fm">{fmt(file.size)} · {file.mimeType?.split("/")[1]?.toUpperCase()}</div>
                        </div>
                        <div className="pk-ck">{isSel ? "✓" : ""}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {drive.user && (
              <div className="pk-ft">
                <div className="pk-cnt"><span>{selectedDriveFiles.length}</span> arquivo{selectedDriveFiles.length!==1?"s":""} selecionado{selectedDriveFiles.length!==1?"s":""}</div>
                <button className="btn-p" disabled={selectedDriveFiles.length===0} onClick={() => setShowDrivePicker(false)}>Confirmar seleção ✦</button>
              </div>
            )}
          </div>
        )}

        {/* ── HOME ── */}
        {screen === "home" && (
          <div className="home">
            <div className="home-hero">
              <div className="home-grain" />
              <div className="badge">IA · Edição Automática</div>
              <h1 className="home-title">Seu editor<br /><span>inteligente</span><br />de vídeos</h1>
              <p className="home-sub">Jogue os brutos, preencha o briefing. A IA faz o resto.</p>
            </div>

            <div className="drive-card">
              {drive.user ? (
                <>
                  {drive.user.picture
                    ? <img className="d-avatar" src={drive.user.picture} alt="" />
                    : <div className="d-avatar-ph">👤</div>}
                  <div className="d-info">
                    <div className="d-name">{drive.user.name}</div>
                    <div className="d-sub">Drive conectado ✓</div>
                  </div>
                  <button className="d-btn off" onClick={drive.signOut}>Sair</button>
                </>
              ) : (
                <>
                  <div className="d-avatar-ph">▲</div>
                  <div className="d-info">
                    <div className="d-name">Google Drive</div>
                    <div className="d-sub">Conecte para importar vídeos</div>
                  </div>
                  <button className="d-btn on" onClick={drive.signIn}>Conectar</button>
                </>
              )}
            </div>

            <div className="home-vis">
              {[{h:"60%",c:"#FF5C3A"},{h:"80%",c:"#FFB547"},{h:"45%",c:"#FF5C3A"},{h:"90%",c:"#FF8C6A"},{h:"55%",c:"#FFB547"},{h:"70%",c:"#FF5C3A"},{h:"38%",c:"#FF8C6A"},{h:"85%",c:"#FFB547"},{h:"60%",c:"#FF5C3A"},{h:"72%",c:"#FF8C6A"}].map((b,i) => (
                <div key={i} className="tbar" style={{height:b.h,background:`linear-gradient(180deg,${b.c}66,${b.c}22)`,animation:`pulse ${1.5+i*.15}s ease infinite`,animationDelay:`${i*.1}s`}} />
              ))}
              <div className="vis-lbl">TIMELINE DE EDIÇÃO</div>
            </div>

            <div className="stats">
              <div className="stat"><div className="stat-n">80%</div><div className="stat-l">Automático</div></div>
              <div className="stat"><div className="stat-n">20×</div><div className="stat-l">Mais rápido</div></div>
              <div className="stat"><div className="stat-n">2</div><div className="stat-l">Formatos</div></div>
            </div>

            <div className="home-cta">
              <button className="btn-p" onClick={() => { setScreen("briefing"); setStep(1); }}>Novo Projeto ✦</button>
              <button className="btn-s">Ver projetos anteriores</button>
            </div>
          </div>
        )}

        {/* ── BRIEFING ── */}
        {screen === "briefing" && (
          <div className="briefing">
            <div className="b-header">
              <div className="steps">
                {[1,2,3,4,5].map(n => <div key={n} className={`sdot ${n<step?"d":n===step?"a":""}`} />)}
              </div>
              <div className="s-lbl">Passo {step} de 5</div>
              <h2 className="s-title">
                {step===1&&"Qual é o evento?"}
                {step===2&&"Qual o mood?"}
                {step===3&&"Color grade"}
                {step===4&&"Formato de saída"}
                {step===5&&"Detalhes finais"}
              </h2>
            </div>

            <div className="b-body">
              {step===1 && <>
                <label className="flbl">Nome do cliente</label>
                <input className="finp" placeholder="Ex: Ana & Pedro" value={form.clientName} onChange={e=>updateForm("clientName",e.target.value)} />
                <label className="flbl">Tipo de evento</label>
                <div className="g3">
                  {EVENTS.map(ev => (
                    <div key={ev.id} className={`ocard ${form.evento===ev.id?"sel":""}`} onClick={()=>updateForm("evento",ev.id)}>
                      <div className="oico">{ev.icon}</div>
                      <div className="olbl">{ev.label}</div>
                    </div>
                  ))}
                </div>
              </>}

              {step===2 && <div className="g2">
                {MOODS.map(m => (
                  <div key={m.id} className={`ocard ${form.mood===m.id?"sel":""}`} onClick={()=>updateForm("mood",m.id)}>
                    <div className="oico">{m.emoji}</div>
                    <div className="olbl">{m.label}</div>
                    <div className="odsc">{m.desc}</div>
                  </div>
                ))}
              </div>}

              {step===3 && <div className="g2">
                {COLOR_GRADES.map(c => (
                  <div key={c.id} className={`ocard ${form.colorGrade===c.id?"sel":""}`} onClick={()=>updateForm("colorGrade",c.id)}>
                    <div className="cswatch" style={{background:`linear-gradient(135deg,${c.color}99,${c.color}33)`}} />
                    <div className="olbl">{c.label}</div>
                  </div>
                ))}
              </div>}

              {step===4 && <>
                <div className="g3" style={{marginBottom:22}}>
                  {FORMATS.map(f => (
                    <div key={f.id} className={`fcard ${form.formato===f.id?"sel":""}`} onClick={()=>updateForm("formato",f.id)}>
                      <div className="fico">{f.icon}</div>
                      <div className="flb">{f.label}</div>
                      <div className="frat">{f.ratio}</div>
                    </div>
                  ))}
                </div>
                <label className="flbl">Duração aproximada</label>
                <div className="dur-row">
                  {["30","60","90","180","300"].map(d => (
                    <button key={d} className={`dbtn ${form.duracao===d?"a":""}`} onClick={()=>updateForm("duracao",d)}>
                      {parseInt(d)<60?`${d}s`:`${parseInt(d)/60}min`}
                    </button>
                  ))}
                </div>
              </>}

              {step===5 && <>
                <label className="flbl">Referência de música</label>
                <input className="finp" placeholder="Ex: instrumental suave, pop animado..." value={form.musica} onChange={e=>updateForm("musica",e.target.value)} />
                <label className="flbl">Observações para a IA</label>
                <textarea className="finp" placeholder="Ex: priorizar a cerimônia, incluir o brinde..." value={form.obs} onChange={e=>updateForm("obs",e.target.value)} />
                <label className="flbl">Vídeos brutos</label>

                {!drive.user && <div className="note">⚡ Conecte o Google Drive na tela inicial para importar vídeos.</div>}

                <button className="di-btn" onClick={()=>setShowDrivePicker(true)} disabled={!drive.user}>
                  <div className="di-ico">▲</div>
                  {drive.user ? "Importar do Google Drive" : "Drive não conectado"}
                </button>

                {selectedDriveFiles.length>0 && (
                  <div className="flist">
                    {selectedDriveFiles.map((f,i) => (
                      <div className="fitem" key={i}>
                        <span>🎞</span>
                        <span className="fn">{f.name}</span>
                        <span className="fs">{fmt(f.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>}
            </div>

            <div className="b-footer">
              {step>1 && <button className="btn-bk" onClick={()=>setStep(s=>s-1)}>←</button>}
              <button className="btn-p" style={{flex:1}} disabled={!canNext()} onClick={()=>{if(step<5)setStep(s=>s+1);else startProcessing();}}>
                {step<5?"Continuar":"Processar vídeo ✦"}
              </button>
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {screen==="processing" && (
          <div className="proc">
            <div className="ring">
              <svg viewBox="0 0 138 138" width="138" height="138">
                <defs>
                  <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF5C3A" /><stop offset="100%" stopColor="#FFB547" />
                  </linearGradient>
                </defs>
                <circle className="ring-t" cx="69" cy="69" r="61" />
                <circle className="ring-f" cx="69" cy="69" r="61"
                  strokeDasharray={`${2*Math.PI*61}`}
                  strokeDashoffset={`${2*Math.PI*61*(1-progress/100)}`}
                />
              </svg>
              <div className="ring-c">
                <div className="ring-pct">{progress}%</div>
                <div>🎬</div>
              </div>
            </div>
            <div className="proc-t">Processando...</div>
            <div className="proc-l">{progressLabel}</div>
            <div className="psteps">
              {["Análise de cenas","Cortes automáticos","Color grade","Legendas IA","Sincronização musical","Exportação"].map((s,i)=>{
                const t=[15,30,48,62,75,96];
                const done=progress>=t[i];
                const act=!done&&progress>=(t[i-1]||0);
                return (
                  <div key={i} className={`pstep ${done?"done":act?"act":""}`}>
                    <div className="pdot" />
                    {done?"✓ ":""}{s}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {screen==="result" && (
          <div className="result">
            <div className="r-hdr">
              <div className="r-ck">✓</div>
              <h2 className="r-t">Vídeo pronto!</h2>
              <p className="r-s">{form.clientName||"Projeto"} · {EVENTS.find(e=>e.id===form.evento)?.label||"Evento"}</p>
            </div>
            <div className="r-body">
              <div className="r-prev">
                <div className="prev-th"><div className="prev-play">▶</div></div>
                <div className="prev-info">
                  <div><div className="prev-n">Rascunho Final</div><div className="prev-m">Salvo no Drive · Agora</div></div>
                </div>
              </div>
              <div className="outs">
                {(form.formato==="reel"||form.formato==="ambos")&&(
                  <div className="oitem"><div className="oico2">📱</div><div className="oi"><div className="on">Reel 9:16</div><div className="od">MP4 · 1080×1920</div></div><div className="odl">↓</div></div>
                )}
                {(form.formato==="aftermovie"||form.formato==="ambos")&&(
                  <div className="oitem"><div className="oico2">🖥</div><div className="oi"><div className="on">Aftermovie 16:9</div><div className="od">MP4 · 1920×1080</div></div><div className="odl">↓</div></div>
                )}
                <div className="oitem"><div className="oico2">📝</div><div className="oi"><div className="on">Legendas (.SRT)</div><div className="od">Geradas por IA · Português</div></div><div className="odl">↓</div></div>
              </div>
            </div>
            <div className="r-ft">
              <button className="btn-p">Abrir no Drive ✦</button>
              <div className="divider">ou</div>
              <button className="btn-s" onClick={()=>{setScreen("home");setForm({evento:"",clientName:"",mood:"",colorGrade:"",formato:"",musica:"",duracao:"60",obs:""});setSelectedDriveFiles([]);setStep(1);setProgress(0);}}>
                Novo projeto
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
