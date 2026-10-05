// @ts-nocheck
"use client";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CSS = `:host{display:block;width:100%;height:100%}
.spin-root{
  --w:clamp(300px, 100vw, 450px);
  --u:calc(var(--w)/63.9);
  --tk:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 150'%3E%3Cpath d='M16 0H264A16 16 0 0 1 280 16V56A19 19 0 0 0 280 94V134A16 16 0 0 1 264 150H16A16 16 0 0 1 0 134V94A19 19 0 0 0 0 56V16A16 16 0 0 1 16 0Z' fill='%23000'/%3E%3C/svg%3E");
  --rim:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 150' fill='none'%3E%3Cpath d='M16 1.5H264A14.5 14.5 0 0 1 278.5 16V56A19 19 0 0 0 278.5 94V134A14.5 14.5 0 0 1 264 148.5H16A14.5 14.5 0 0 1 1.5 134V94A19 19 0 0 0 1.5 56V16A14.5 14.5 0 0 1 16 1.5Z' stroke='rgba(255,255,255,0.32)' stroke-width='2.6'/%3E%3C/svg%3E");
  --rim-gold:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 150' fill='none'%3E%3Cdefs%3E%3ClinearGradient id='rg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23FFF3B0'/%3E%3Cstop offset='50%25' stop-color='%23F4B92B'/%3E%3Cstop offset='100%25' stop-color='%23B4700C'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M16 1.5H264A14.5 14.5 0 0 1 278.5 16V56A19 19 0 0 0 278.5 94V134A14.5 14.5 0 0 1 264 148.5H16A14.5 14.5 0 0 1 1.5 134V94A19 19 0 0 0 1.5 56V16A14.5 14.5 0 0 1 16 1.5Z' stroke='url(%23rg)' stroke-width='3.2'/%3E%3C/svg%3E");
  position:relative;width:100%;height:100%;display:flex;direction:ltr;justify-content:center;overflow:hidden;isolation:isolate;background:#0C0C0E;color:#fff;font-family:Inter,"SF Pro Text",system-ui,sans-serif;overscroll-behavior:none;text-align:left;line-height:normal;box-sizing:border-box
}
.spin-root *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.spin-root button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}
.spin-root :focus-visible{outline:calc(.3*var(--u)) solid #7cc4ff;outline-offset:calc(.3*var(--u))}
.spin-root .app{position:relative;width:var(--w);height:100%;margin:0 auto;flex:none;background:radial-gradient(120% 60% at 50% 0%,#15294a 0%,transparent 70%),linear-gradient(180deg,#0a1424 0%,#060c18 100%);display:grid;grid-template-rows:1fr auto;overflow:hidden;isolation:isolate;padding-top:env(safe-area-inset-top,0px)}
.spin-root .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.spin-root #reel-mount{position:relative;min-height:0}
.spin-root .reel{position:absolute;inset:0;overflow:hidden;--grow:0;contain:layout paint}
.spin-root .reel__track{position:absolute;left:0;right:0;top:calc(50% - calc(58.8*var(--u)));will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.spin-root .slot{height:calc(16.8*var(--u));display:grid;place-items:center}
.spin-root .slot:first-child .ticket,
.spin-root .slot:last-child .ticket{opacity:.35;filter:drop-shadow(0 calc(.4*var(--u)) calc(.8*var(--u)) rgba(0,0,0,.9)) brightness(.55);transform:scale(.92)}
.spin-root .slot:nth-child(2) .ticket,
.spin-root .slot:nth-child(6) .ticket{opacity:.88;transform:scale(.96)}
.spin-root .slot:nth-child(3) .ticket,
.spin-root .slot:nth-child(5) .ticket{opacity:.97;transform:scale(.99)}
.spin-root .slot:nth-child(4) .ticket.is-focus{opacity:1;transform:scale(calc(1.08 + var(--grow) + var(--bonus)));z-index:3}
.spin-root .reel__fog{position:absolute;left:0;right:0;height:24%;z-index:4;pointer-events:none}
.spin-root .reel__fog--top{top:0;background:linear-gradient(180deg,#060c18 0%,rgba(6,12,24,.94) 28%,rgba(6,12,24,.4) 75%,transparent 100%)}
.spin-root .reel__fog--bottom{bottom:0;background:linear-gradient(0deg,#060c18 0%,rgba(6,12,24,.94) 28%,rgba(6,12,24,.4) 75%,transparent 100%)}
.spin-root .ticket.is-near{transform:scale(1.05);z-index:2}
.spin-root .ticket.is-near::before{opacity:.55}
.spin-root .sound{position:absolute;top:calc(1.6*var(--u));right:calc(2*var(--u));z-index:5;width:max(40px,calc(5*var(--u)));height:max(40px,calc(5*var(--u)));display:grid;place-items:center;border-radius:50%;color:#8aa4b8;background:rgba(255,255,255,.07);backdrop-filter:blur(8px);transition:background .2s,color .2s,transform .15s}
.spin-root .sound:hover{background:rgba(255,255,255,.14)}
.spin-root .sound:active{transform:scale(.9)}
.spin-root .sound[aria-pressed=true]{color:#7fc4f5}
.spin-root .sound svg{width:calc(2.6*var(--u));height:calc(2.6*var(--u))}
.spin-root .nav{position:absolute;top:50%;translate:0 -50%;z-index:5;width:calc(7*var(--u));height:calc(9*var(--u));display:grid;place-items:center;border-radius:calc(2*var(--u));transition:transform .2s,opacity .3s}
.spin-root .nav--prev{left:calc(3.4*var(--u))}
.spin-root .nav--next{right:calc(3.4*var(--u))}
.spin-root .nav svg{width:calc(3.9*var(--u));height:calc(5.2*var(--u));filter:drop-shadow(0 calc(.3*var(--u)) calc(.6*var(--u)) rgba(38,155,232,.35))}
.spin-root .nav:hover{transform:scale(1.1)}
.spin-root .nav:active{transform:scale(.92)}
.spin-root .nav:disabled{opacity:.35;cursor:default}
.spin-root .ticket{--c1:#3ba2ec;--c2:#1d7bc7;--c3:#115594;--ink:#ffffff;--glow:rgba(38,155,232,.5);--bonus:0;position:relative;width:calc(28*var(--u));height:calc(15*var(--u));transform:scale(1);transition:transform .4s cubic-bezier(.34,1.5,.5,1),filter .4s ease,opacity .3s ease;filter:drop-shadow(0 calc(.7*var(--u)) calc(.9*var(--u)) rgba(0,0,0,.65))}
.spin-root .ticket[data-tier=gold]{--c1:#f5cf53;--c2:#cf9b17;--c3:#8e6407;--ink:#ffffff;--glow:rgba(235,195,65,.65);--bonus:.05}
.spin-root .ticket[data-tier=teal]{--c1:#2fd8cf;--c2:#139e99;--c3:#096a67;--ink:#ffffff;--glow:rgba(24,184,181,.55)}
.spin-root .ticket[data-tier=violet]{--c1:#ab8dfa;--c2:#7c48f2;--c3:#4d20b5;--ink:#ffffff;--glow:rgba(139,92,246,.55)}
.spin-root .ticket[data-tier=orange]{--c1:#ffaa4d;--c2:#df6c10;--c3:#9c4303;--ink:#ffffff;--glow:rgba(242,140,40,.55)}
.spin-root .ticket[data-tier=green]{--c1:#5ee185;--c2:#2aab54;--c3:#166e34;--ink:#ffffff;--glow:rgba(61,190,107,.55)}
.spin-root .ticket[data-tier=pink]{--c1:#f57ab7;--c2:#d82e82;--c3:#8e1350;--ink:#ffffff;--glow:rgba(233,78,155,.55)}
.spin-root .ticket::before{content:"";position:absolute;inset:calc(-2.5*var(--u));border-radius:calc(4*var(--u));background:radial-gradient(closest-side,var(--glow),transparent);opacity:0;transition:opacity .6s ease;z-index:-1}
.spin-root .ticket::after{content:"";position:absolute;inset:calc(-.3*var(--u));border-radius:calc(2.2*var(--u));box-shadow:0 0 calc(3*var(--u)) calc(.8*var(--u)) var(--glow);opacity:0;pointer-events:none}
.spin-root .ticket.is-focus{transform:scale(calc(1.08 + var(--grow) + var(--bonus)));z-index:2;filter:drop-shadow(0 calc(1.2*var(--u)) calc(1.8*var(--u)) rgba(0,0,0,.75))}
.spin-root .ticket.is-focus::before{opacity:calc(.35 + var(--grow)*1.5)}
.spin-root .ticket.is-win::after{animation:spin-win 1.5s ease-out}
@keyframes spin-win{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
.spin-root .ticket__body{
  position:absolute;inset:0;
  -webkit-mask-image:var(--tk);
  mask-image:var(--tk);
  -webkit-mask-size:100% 100%;
  mask-size:100% 100%;
  background:linear-gradient(180deg,var(--c1) 0%,var(--c2) 50%,var(--c3) 100%);
  box-shadow:inset 0 calc(.25*var(--u)) calc(.15*var(--u)) rgba(255,255,255,.45),inset 0 calc(-.35*var(--u)) calc(.2*var(--u)) rgba(0,0,0,.25);
  overflow:hidden
}
.spin-root .ticket__body::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 48%,transparent 60%);opacity:.7}
.spin-root .ticket__rim{
  position:absolute;inset:0;
  background-image:var(--rim);
  background-size:100% 100%;
  background-repeat:no-repeat;
  pointer-events:none;
  z-index:3;
}
.spin-root .ticket[data-tier=gold] .ticket__rim{
  background-image:var(--rim-gold);
}
.spin-root .ticket__doodles{position:absolute;inset:0;opacity:.28;pointer-events:none}
.spin-root .ticket__perf{position:absolute;top:calc(1*var(--u));bottom:calc(1*var(--u));right:calc(6.8*var(--u));width:1px;border-left:calc(.15*var(--u)) dashed rgba(255,255,255,.22);pointer-events:none;z-index:2}
.spin-root .ticket__frame{position:absolute;inset:calc(1.2*var(--u));border-radius:calc(1.2*var(--u));border:calc(.15*var(--u)) solid rgba(255,255,255,.2);background:radial-gradient(ellipse 80% 70% at 50% 55%,rgba(255,255,255,.14),rgba(255,255,255,0) 75%),linear-gradient(rgba(255,255,255,.1),rgba(255,255,255,0));box-shadow:0 calc(.15*var(--u)) 0 rgba(255,255,255,.25),inset 0 calc(.15*var(--u)) calc(.25*var(--u)) rgba(0,0,0,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(.35*var(--u));color:var(--ink);overflow:hidden;padding-right:calc(1.5*var(--u))}
.spin-root .ticket__amount{display:flex;align-items:center;gap:calc(var(--cn,calc(5.4*var(--u)))*.22)}
.spin-root .ticket__amount b{font-size:var(--fs,calc(5.2*var(--u)));font-weight:800;letter-spacing:-.035em;line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums;text-shadow:0 calc(.15*var(--u)) calc(.3*var(--u)) rgba(0,0,0,.45)}
.spin-root .ticket__frame>span{font-size:calc(2*var(--u));font-weight:600;line-height:1;letter-spacing:.02em;text-shadow:0 1px 2px rgba(0,0,0,.3)}
.spin-root .coin{width:var(--cn,calc(5.4*var(--u)));height:var(--cn,calc(5.4*var(--u)));max-width:calc(6.2*var(--u));max-height:calc(6.2*var(--u));flex:none;display:inline-block;vertical-align:middle;filter:drop-shadow(0 calc(.2*var(--u)) calc(.4*var(--u)) rgba(0,0,0,.3))}
.spin-root .ticket[data-tier=gold].is-vip{--c1:#fff0b0;--c2:#f4b92b;--c3:#b4700c;--glow:rgba(255,190,50,.85)}
.spin-root .is-vip .ticket__frame{border-color:rgba(255,248,205,.7);box-shadow:0 calc(.15*var(--u)) 0 rgba(255,255,255,.6),inset 0 0 calc(1.6*var(--u)) rgba(255,235,150,.4)}
.spin-root .vip{position:absolute;left:50%;top:calc(-1.7*var(--u));translate:-50% 0;z-index:4;display:flex;align-items:center;gap:calc(.6*var(--u));padding:calc(.55*var(--u)) calc(1.5*var(--u)) calc(.65*var(--u));border-radius:calc(2*var(--u));background:linear-gradient(#2c1f06,#120c02);color:#ffd96e;font-size:calc(1.9*var(--u));font-weight:800;letter-spacing:.08em;line-height:1;border:calc(.15*var(--u)) solid #e9b838;box-shadow:0 calc(.4*var(--u)) calc(1*var(--u)) rgba(0,0,0,.6),inset 0 calc(.1*var(--u)) 0 rgba(255,230,150,.35);opacity:0;transform:translateY(calc(1*var(--u))) scale(.7);transition:opacity .3s,transform .4s cubic-bezier(.34,1.56,.64,1);pointer-events:none}
.spin-root .vip svg{width:calc(2.1*var(--u));height:calc(2.1*var(--u))}
.spin-root .is-vip .vip{opacity:1;transform:none}
.spin-root .bet small.is-vip{color:#f2c14e}
.spin-root .jackpot{position:absolute;inset:0;z-index:30;display:grid;place-items:center;overflow:hidden;opacity:0;visibility:hidden;background:rgba(4,8,18,.92);backdrop-filter:blur(10px);transition:opacity .35s ease,visibility .35s}
.spin-root .jackpot.is-on{opacity:1;visibility:visible}
.spin-root .jackpot__rays,.spin-root .jackpot__glow{position:absolute;left:50%;top:50%;pointer-events:none}
.spin-root .jackpot__rays{width:calc(110*var(--u));height:calc(110*var(--u));margin:calc(-55*var(--u)) 0 0 calc(-55*var(--u));background:radial-gradient(circle,rgba(255,214,110,.25) 0%,transparent 65%);opacity:0;transition:opacity .8s .1s}
.spin-root .jackpot__glow{width:calc(80*var(--u));height:calc(80*var(--u));margin:calc(-40*var(--u)) 0 0 calc(-40*var(--u));background:radial-gradient(closest-side,var(--gl1,rgba(255,196,60,.6)),var(--gl2,rgba(255,160,30,.2)) 55%,transparent);opacity:0;transform:scale(.3);transition:opacity .7s,transform .9s cubic-bezier(.2,.8,.3,1)}
.spin-root .is-on .jackpot__rays{opacity:var(--rayo,1);animation:spin-raysTurn 24s linear infinite}
.spin-root .is-on .jackpot__glow{opacity:1;transform:scale(1)}
.spin-root .jackpot[data-tier=blue]{--gl1:rgba(38,155,232,.55);--gl2:rgba(38,155,232,.18);--ray:rgba(130,205,255,.16);--rayo:.7}
.spin-root .jackpot[data-tier=teal]{--gl1:rgba(24,184,181,.55);--gl2:rgba(24,184,181,.18);--ray:rgba(120,235,230,.16);--rayo:.7}
.spin-root .jackpot[data-tier=pink]{--gl1:rgba(233,78,155,.55);--gl2:rgba(233,78,155,.18);--ray:rgba(255,150,200,.16);--rayo:.7}
.spin-root .jackpot[data-tier=violet]{--gl1:rgba(139,92,246,.55);--gl2:rgba(139,92,246,.18);--ray:rgba(190,165,255,.16);--rayo:.7}
.spin-root .jackpot[data-tier=orange]{--gl1:rgba(242,140,40,.55);--gl2:rgba(242,140,40,.18);--ray:rgba(255,200,130,.16);--rayo:.7}
.spin-root .jackpot[data-tier=green]{--gl1:rgba(61,190,107,.55);--gl2:rgba(61,190,107,.18);--ray:rgba(150,235,175,.16);--rayo:.7}
.spin-root .jackpot__label{position:absolute;left:0;right:0;top:calc(50% - calc(25*var(--u)));margin:0;text-align:center;font-size:max(16px,calc(2.8*var(--u)));font-weight:800;color:#fff;opacity:0;transform:translateY(calc(1*var(--u)));transition:opacity .4s .3s,transform .5s .3s cubic-bezier(.2,1.2,.4,1);z-index:4}
.spin-root .is-on .jackpot__label{opacity:1;transform:none}
.spin-root .jackpot[data-tier=gold] .jackpot__label{color:#ffd96e}
@keyframes spin-raysTurn{to{transform:rotate(360deg)}}
.spin-root .jackpot__card{position:relative;transform:scale(.5);opacity:0;transition:transform .8s cubic-bezier(.2,1.3,.35,1),opacity .3s;z-index:3}
.spin-root .is-on .jackpot__card{transform:scale(1.6);opacity:1}
.spin-root .jackpot .slot{height:auto}
.spin-root .jackpot__sub{position:absolute;left:0;right:0;top:calc(50% + calc(17*var(--u)));margin:0;padding:0 calc(4*var(--u));text-align:center;font-size:max(13px,calc(2.2*var(--u)));font-weight:600;color:#f3d890;opacity:0;transform:translateY(calc(-.8*var(--u)));transition:opacity .6s 1.0s,transform .6s 1.0s ease-out;z-index:4}
.spin-root .is-on .jackpot__sub{opacity:1;transform:none}
.spin-root .jackpot__close{position:absolute;bottom:calc(calc(6*var(--u)) + env(safe-area-inset-bottom,0px));left:50%;translate:-50% 0;min-height:max(46px,calc(5.8*var(--u)));padding:0 calc(4*var(--u));border-radius:calc(2.4*var(--u));background:linear-gradient(#38b0ff,#1d83dc);color:#fff;font-size:max(15px,calc(2.5*var(--u)));font-weight:700;opacity:0;transition:opacity .4s .8s;z-index:5;box-shadow:0 8px 24px rgba(30,131,220,.4)}
.spin-root .is-on .jackpot__close{opacity:1}
.spin-root .panel{position:relative;z-index:4;background:linear-gradient(180deg,#111b2f 0%,#090f1d 100%);border-radius:calc(3.4*var(--u)) calc(3.4*var(--u)) 0 0;padding:calc(2*var(--u)) calc(2.4*var(--u)) calc(calc(1.8*var(--u)) + env(safe-area-inset-bottom,0px));box-shadow:0 calc(-.1*var(--u)) 0 rgba(255,255,255,.08),0 calc(-2*var(--u)) calc(3*var(--u)) rgba(0,0,0,.85)}
.spin-root .panel__row{display:flex;align-items:center;justify-content:space-between;gap:calc(1*var(--u))}
.spin-root .balance{display:flex;align-items:center;gap:calc(2*var(--u));min-width:0}
.spin-root .balance .coin{width:calc(6.6*var(--u));height:calc(6.6*var(--u))}
.spin-root .balance strong{display:block;font-size:max(13px,calc(2.4*var(--u)));font-weight:700;white-space:nowrap}
.spin-root .balance button{font-size:max(12px,calc(2.2*var(--u)));font-weight:600;color:var(--sky,#4aa8f0);margin-top:calc(.4*var(--u));border-radius:calc(.6*var(--u))}
.spin-root .bet{display:flex;flex-direction:column;align-items:flex-end;gap:calc(.5*var(--u))}
.spin-root .bet__row{display:flex;align-items:center}
.spin-root .bet__step{width:max(38px,calc(6*var(--u)));height:max(38px,calc(6*var(--u)));display:grid;place-items:center;border-radius:50%;color:#4aa8f0;background:rgba(74,168,240,.08);transition:transform .15s,background .2s}
.spin-root .bet__step svg{width:calc(2.6*var(--u));height:calc(2.6*var(--u))}
.spin-root .bet__step:hover{background:rgba(74,168,240,.18)}
.spin-root .bet__step:active{transform:scale(.88)}
.spin-root .bet__step:disabled{opacity:.25;cursor:default}
.spin-root .bet__value{min-width:calc(6.5*var(--u));text-align:center;font-size:max(15px,calc(2.8*var(--u)));font-weight:700;font-variant-numeric:tabular-nums}
.spin-root .bet small{font-size:max(11px,calc(2*var(--u)));font-weight:500;color:#94a3b8;white-space:nowrap;padding-right:calc(.3*var(--u))}
.spin-root .free-banner{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,rgba(245,197,65,.15),rgba(24,184,181,.15));border:1px solid rgba(245,197,65,.35);padding:calc(1*var(--u)) calc(1.6*var(--u));border-radius:calc(1.8*var(--u));margin-bottom:calc(1.4*var(--u))}
.spin-root .free-banner span{font-size:max(12px,calc(2.1*var(--u)));font-weight:700;color:#fcd34d;display:flex;align-items:center;gap:calc(.6*var(--u))}
.spin-root .free-banner small{font-size:max(10px,calc(1.8*var(--u)));color:#93c5fd;font-weight:600}
.spin-root .actions{display:grid;grid-template-columns:19.7fr 36.9fr;gap:calc(1.8*var(--u));margin-top:calc(1.4*var(--u))}
.spin-root .act{height:max(50px,calc(8.2*var(--u)));border-radius:calc(2.4*var(--u));font-size:max(15px,calc(2.7*var(--u)));font-weight:700;display:flex;align-items:center;justify-content:center;gap:calc(1*var(--u));transition:transform .15s ease,background .25s,box-shadow .25s;box-shadow:inset 0 calc(.1*var(--u)) 0 rgba(255,255,255,.1),0 calc(.4*var(--u)) calc(1.2*var(--u)) rgba(0,0,0,.5);white-space:nowrap}
.spin-root .act:active:not(:disabled){transform:scale(.97)}
.spin-root .auto{background:#162335;color:#3fa6ea}
.spin-root .auto:hover{background:#1e314a}
.spin-root .auto__dot{width:calc(1.1*var(--u));height:calc(1.1*var(--u));border-radius:50%;background:#3a5167;transition:background .25s}
.spin-root .auto[aria-pressed=true]{background:linear-gradient(#1f4a73,#173a5c);color:#a8dcff;box-shadow:inset 0 0 0 calc(.2*var(--u)) #3fa6ea}
.spin-root .spin{background:linear-gradient(180deg,#38b0ff,#1d83dc 60%,#176cc0);color:#fff;box-shadow:inset 0 calc(.15*var(--u)) 0 rgba(255,255,255,.35)}
.spin-root .spin.is-free{background:linear-gradient(180deg,#facc15,#eab308 60%,#ca8a04);color:#3d2402;text-shadow:0 1px 0 rgba(255,255,255,.3);animation:spin-pulse 2s infinite}
@keyframes spin-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02);box-shadow:0 0 16px rgba(234,179,8,.5)}}
.spin-root .spin:hover:not(:disabled){filter:brightness(1.08)}
.spin-root .spin:disabled{cursor:default;background:linear-gradient(#2a7fbf,#1f67a3);color:#d6ecff;opacity:.7}
.spin-root .referral-strip{display:flex;align-items:center;justify-content:space-between;gap:calc(1*var(--u));margin-top:calc(1.4*var(--u));padding:calc(.9*var(--u)) calc(1.4*var(--u));border-radius:calc(1.8*var(--u));background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
.spin-root .referral-strip p{margin:0;font-size:max(11px,calc(1.9*var(--u)));color:#cbd5e1;font-weight:600}
.spin-root .referral-strip .ref-btns{display:flex;gap:calc(.8*var(--u))}
.spin-root .referral-strip button{padding:calc(.5*var(--u)) calc(1.2*var(--u));border-radius:calc(1*var(--u));font-size:max(11px,calc(1.9*var(--u)));font-weight:700;display:flex;align-items:center;gap:calc(.4*var(--u))}
.spin-root .ref-btn-story{background:linear-gradient(#0088cc,#006699);color:#fff}
.spin-root .ref-btn-copy{background:rgba(255,255,255,.1);color:#fff}
.spin-root .is-spinning .ticket{filter:none !important;box-shadow:none !important}
.spin-root .is-spinning .ticket::before{display:none}
`;

const MARKUP = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
<symbol id="usdt" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="#009393"/><path d="M 160 128 H 352 L 438 243 L 258 419 L 74 243 Z" fill="#ffffff" stroke="#ffffff" stroke-width="24" stroke-linejoin="round"/><path fill="#009393" fill-rule="evenodd" d="M 164 258 A 92 25 0 1 0 348 258 A 92 25 0 1 0 164 258 Z M 182 258 A 74 11 0 1 0 330 258 A 74 11 0 1 0 182 258 Z"/><rect x="178" y="177" width="156" height="30" rx="4" fill="#009393"/><rect x="236" y="177" width="40" height="159" rx="4" fill="#009393"/></symbol>
<pattern id="doodleA" width="48" height="48" patternUnits="userSpaceOnUse">
  <path d="M12 10h4v2h-4zM32 14h2v4h-2zM10 30h3v3h-3zM28 34h4v2h-4z" fill="rgba(255,255,255,0.08)"/>
  <circle cx="34" cy="10" r="1.5" fill="rgba(255,255,255,0.06)"/>
  <circle cx="14" cy="38" r="1.5" fill="rgba(255,255,255,0.06)"/>
  <path d="M20 20l4-4 2 2 4-4" stroke="rgba(255,255,255,0.08)" stroke-width="1.2" fill="none"/>
</pattern>
</defs>
</svg>

<main class="app" id="app">
<div id="reel-mount"></div>
<div id="panel-mount"></div>
<div class="sr" aria-live="polite" id="announce"></div>
<div class="jackpot" id="jackpot" role="dialog" aria-modal="true" aria-label="Prize won" aria-hidden="true"><div class="jackpot__rays"></div><div class="jackpot__glow"></div><p class="jackpot__label"></p><div class="jackpot__card"></div><p class="jackpot__sub"></p><button class="jackpot__close" type="button">Claim & Continue</button></div>
</main>`;

type SpinProps = {
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
};

export function Spin({ className, style, height }: SpinProps) {
  const host = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, creditUserBalance } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;
  const creditRef = useRef(creditUserBalance);
  creditRef.current = creditUserBalance;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const balancePanelRef = useRef<any>(null);

  useEffect(() => {
    const hostEl = host.current as HTMLElement;
    if (!hostEl) return;
    const sr = hostEl.shadowRoot;
    const balEl = sr?.querySelector('#spin-bal');
    if (balEl && user) {
      const b = user.balance ?? user.cryptoBalances?.USDT ?? 0;
      const formatted = (b < 100 ? Math.round(b * 10) / 10 : Math.round(b)).toLocaleString();
      balEl.textContent = formatted;
      balancePanelRef.current?.update?.(b);
    }
  }, [user?.balance, user?.cryptoBalances?.USDT]);

  useEffect(() => {
    const hostEl = host.current as HTMLElement;
    if (!hostEl) return;
    const sr = hostEl.shadowRoot || hostEl.attachShadow({ mode: "open" });
    sr.innerHTML = `<style>${CSS}</style><div class="spin-root">${MARKUP}</div>`;
    const rootEl = sr.querySelector(".spin-root") as HTMLElement;
    if (!rootEl) return;

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
      }
    } catch {}

    const freeSpinKey = `arbix_freespin_${userRef.current?.id || 'guest'}`;
    let isFreeSpinAvailable = !localStorage.getItem(freeSpinKey);

    // Standard requested bet progression: 1, 2, 5, 10, 20, 50
    const BET_TIERS = [1, 2, 5, 10, 20, 50];
    const BET_MIN = BET_TIERS[0], BET_MAX = BET_TIERS[BET_TIERS.length - 1];
    const ROYAL_BY_BET = { 1: 500, 2: 650, 5: 900, 10: 1200, 20: 1500, 50: 2000 };
    const getRoyalPrize = v => ROYAL_BY_BET[v] || (v <= 1 ? 500 : v >= 50 ? 2000 : Math.round(500 + (1500 * (v - 1)) / 49));

    // Base prizes when bet is $1: 2, 3, 7, 15, and Royal $500 (No empty cards)
    const PRIZES = [
      { base: 2, tier: 'green', w: 36 },
      { base: 3, tier: 'blue', w: 30 },
      { base: 7, tier: 'teal', w: 20 },
      { base: 15, tier: 'pink', w: 14 },
      { base: 500, tier: 'gold', w: 0 }
    ];
    const gold = PRIZES.find(p => p.tier === 'gold');
    const POOL = PRIZES.filter(p => p.tier !== 'gold');
    const VIP_AT = 20;
    const Econ = { mult: 1, vip: false, bet: 1 };
    const fmt = n => {
      const v = n < 100 ? Math.round(n * 100) / 100 : Math.round(n);
      const [a, b] = String(v).split('.');
      return a.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + (b ? '.' + b : '');
    };
    const sizing = t => t.length <= 3 ? [5.0, 5.2] : t.length === 4 ? [4.6, 4.8] : t.length === 5 ? [4.0, 4.2] : [3.5, 3.8];
    const pickFrom = avoid => {
      const ok = POOL.filter(p => !avoid.includes(p.base)), c = ok.length ? ok : POOL;
      let r = Math.random() * c.reduce((a, p) => a + p.w, 0);
      for (const p of c) { if ((r -= p.w) < 0) return p; }
      return c[0];
    };
    const sequence = (prev, n, at, force) => {
      const out = [], hist = prev.map(p => p.base);
      for (let i = 0; i < n; i++) {
        const av = hist.slice(-5);
        const p = i === at ? (force || pickFrom(av)) : pickFrom(av);
        out.push(p);
        hist.push(p.base);
      }
      return out;
    };

    const easeSpin = t => {
      const r = Math.min(t / .08, 1), k = r * r * (3 - 2 * r);
      return (1 - Math.pow(1 - t, 3)) * k - .008 * Math.sin(Math.PI * r);
    };
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const SPIN_MS = 3800, SPIN_CARDS = 20;

    // Lightweight Web Audio synthesizer (0ms CPU, zero loop allocations)
    const Sound = {
      ctx: null, on: true,
      init() {
        if (!this.ctx) {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return;
          this.ctx = new C();
          this.out = this.ctx.createGain();
          this.out.gain.value = .8;
          this.out.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      },
      ready() { return this.on && this.ctx; },
      tick() {
        if (!this.ready()) return;
        const c = this.ctx, t = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(70, t + .07);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.1, t + .006);
        g.gain.exponentialRampToValueAtTime(.0001, t + .08);
        o.connect(g).connect(this.out);
        o.start(t); o.stop(t + .085);
      },
      whoosh() {
        if (!this.ready()) return;
        const c = this.ctx, t = c.currentTime;
        const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
        o.type = 'triangle';
        f.type = 'bandpass';
        f.Q.value = 1.2;
        f.frequency.setValueAtTime(220, t);
        f.frequency.exponentialRampToValueAtTime(1400, t + 0.8);
        f.frequency.exponentialRampToValueAtTime(320, t + 1.9);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
        o.connect(f).connect(g).connect(this.out);
        o.start(t); o.stop(t + 2.15);
      },
      bell(freq, at, gain, dur) {
        const c = this.ctx;
        [[1, 1], [2.76, .25]].forEach(([m, a]) => {
          const o = c.createOscillator(), g = c.createGain();
          o.type = 'sine';
          o.frequency.value = freq * m;
          g.gain.setValueAtTime(.0001, at);
          g.gain.exponentialRampToValueAtTime(gain * a, at + .01);
          g.gain.exponentialRampToValueAtTime(.0001, at + dur / m ** .4);
          o.connect(g).connect(this.out);
          o.start(at); o.stop(at + dur + .08);
        });
      },
      blip(f0, f1, dur, gain, type = 'sine') {
        if (!this.ready()) return;
        const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + .006);
        g.gain.exponentialRampToValueAtTime(.0001, t + dur + .04);
        o.connect(g).connect(this.out);
        o.start(t); o.stop(t + dur + .05);
      },
      ui(kind) {
        ({
          up: () => this.blip(400, 600, .06, .12),
          down: () => this.blip(600, 400, .06, .12),
          nav: () => this.blip(520, 700, .05, .09),
          press: () => this.blip(200, 80, .12, .25),
          dud: () => this.blip(300, 180, .16, .12)
        })[kind]?.();
      },
      vip() {
        if (!this.ready()) return;
        [1047, 1319, 1568, 2093].forEach((f, i) => this.bell(f, this.ctx.currentTime + i * .07, .12, 1.2));
      },
      win(tier) {
        if (!this.ready()) return;
        const t = this.ctx.currentTime + .02;
        const seq = { blue: [659, 880], teal: [523, 659, 784], pink: [523, 659, 784, 1047], gold: [523, 659, 784, 1047, 1319, 1568] }[tier] || [659, 880];
        seq.forEach((f, i) => this.bell(f, t + i * .09, tier === 'gold' ? .18 : .14, tier === 'gold' ? 1.6 : 1.1));
      }
    };

    const Coin = () => '<svg class="coin" viewBox="0 0 32 32" aria-hidden="true"><use href="#usdt"/></svg>';
    const PACK_NAME = 'Royal';
    const Crown = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18L2 8l5 4 5-8 5 8 5-4-1 10zM4 20h16v1.500H4z"/></svg>';
    const PrizeCard = p => {
      const isGold = p.tier === 'gold';
      const val = isGold ? getRoyalPrize(Econ.bet) : (p.base * Econ.mult);
      const t = fmt(val);
      const [fs, cn] = sizing(t);
      return `<div class="slot"><article class="ticket${isGold && Econ.vip ? ' is-vip' : ''}" data-tier="${p.tier}" data-base="${p.base}" style="--fs:calc(${fs}*var(--u));--cn:calc(${cn}*var(--u))"><div class="ticket__body"><svg class="ticket__doodles" viewBox="0 0 280 150" preserveAspectRatio="none"><rect width="100%" height="100%" fill="url(#doodleA)"/></svg><div class="ticket__perf"></div><div class="ticket__frame"><div class="ticket__amount">${Coin()}<b>${t}</b></div><span>Tether</span></div></div><div class="ticket__rim"></div>${isGold ? `<span class="vip" aria-hidden="true">${Crown}${PACK_NAME.toUpperCase()}</span>` : ''}</article></div>`;
    };

    class PrizeReel {
      constructor(mount) {
        mount.innerHTML = `<section class="reel" aria-label="Prize reel"><div class="reel__fog reel__fog--top"></div><div class="reel__fog reel__fog--bottom"></div>
        <button class="nav nav--prev" type="button" aria-label="Previous prize"><svg viewBox="0 0 38 52"><path d="M7 5.500L32 24a2.800 2.800 0 0 1 0 4L7 46.500C4 48.800 2 47.800 2 44V8c0-3.800 2-4.800 5-2.500z" fill="#269BE8" stroke="#269BE8" stroke-width="4" stroke-linejoin="round"/></svg></button>
        <button class="nav nav--next" type="button" aria-label="Next prize"><svg viewBox="0 0 38 52"><path d="M31 5.500L6 24a2.800 2.800 0 0 0 0 4l25 18.500c3 2.300 5 1.300 5-2.500V8c0-3.800-2-4.800-5-2.500z" fill="#269BE8" stroke="#269BE8" stroke-width="4" stroke-linejoin="round"/></svg></button>
        <div class="reel__track"></div></section>`;
        this.root = mount.firstElementChild;
        this.track = this.root.querySelector('.reel__track');
        this.navs = [...this.root.querySelectorAll('.nav')];
        // Clean initial view with 7 cards, center is Royal $500
        this.view = [{ base: 3, tier: 'blue' }, { base: 7, tier: 'teal' }, { base: 15, tier: 'pink' }, gold, { base: 2, tier: 'green' }, { base: 3, tier: 'blue' }, { base: 7, tier: 'teal' }];
        this.busy = false; this.onBusy = () => {};
        this.navs[0].onclick = () => { Sound.init(); this.move(-1); };
        this.navs[1].onclick = () => { Sound.init(); this.move(1); };
        this.render(this.view); this.settle(false);
      }
      render(list) { this.track.innerHTML = list.map(PrizeCard).join(''); }
      pitch() { return this.track.firstElementChild?.offsetHeight || 100; }
      focusCard() { return this.track.children[3]?.firstElementChild; }
      setGrow(v) { this.root.style.setProperty('--grow', v); }
      refresh() {
        this.track.querySelectorAll('.ticket').forEach(t => {
          const isGold = t.dataset.tier === 'gold';
          const val = isGold ? getRoyalPrize(Econ.bet) : (+t.dataset.base * Econ.mult);
          const x = fmt(val);
          const [fs, cn] = sizing(x);
          t.querySelector('b').textContent = x;
          t.style.setProperty('--fs', 'calc(' + fs + '*var(--u))');
          t.style.setProperty('--cn', 'calc(' + cn + '*var(--u))');
          if (isGold) t.classList.toggle('is-vip', Econ.vip);
        });
      }
      smoothUpdateBet(oldBet, newBet) {
        const fromRoyal = getRoyalPrize(oldBet);
        const toRoyal = getRoyalPrize(newBet);
        const cards = [];
        this.track.querySelectorAll('.ticket').forEach(t => {
          const isGold = t.dataset.tier === 'gold';
          const bEl = t.querySelector('b');
          if (!bEl) return;
          const base = +t.dataset.base || 0;
          const startVal = isGold ? fromRoyal : (base * oldBet);
          const endVal = isGold ? toRoyal : (base * newBet);
          cards.push({ t, bEl, isGold, startVal, endVal, lastVal: -1 });
        });

        if (this._tweenRaf) cancelAnimationFrame(this._tweenRaf);
        const duration = 200;
        const startTime = performance.now();

        const step = now => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - progress, 3);

          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            const currentVal = progress >= 1 ? c.endVal : Math.round(c.startVal + (c.endVal - c.startVal) * ease);
            if (currentVal !== c.lastVal) {
              c.lastVal = currentVal;
              c.bEl.textContent = fmt(currentVal);
            }
          }

          if (progress < 1) {
            this._tweenRaf = requestAnimationFrame(step);
          } else {
            this._tweenRaf = null;
            this.track.querySelectorAll('.ticket').forEach(t => {
              const isGold = t.dataset.tier === 'gold';
              const finalVal = isGold ? toRoyal : (+t.dataset.base * newBet);
              const x = fmt(finalVal);
              const [fs, cn] = sizing(x);
              t.style.setProperty('--fs', 'calc(' + fs + '*var(--u))');
              t.style.setProperty('--cn', 'calc(' + cn + '*var(--u))');
              if (isGold) t.classList.toggle('is-vip', Econ.vip);
            });
          }
        };
        this._tweenRaf = requestAnimationFrame(step);
      }
      setBusy(b) { this.busy = b; this.navs.forEach(n => n.disabled = b); this.onBusy(b); }
      settle(win) {
        requestAnimationFrame(() => {
          const c = this.focusCard();
          if (!c) return;
          c.classList.add('is-focus');
          if (win) {
            c.classList.add('is-win');
            setTimeout(() => c.classList.remove('is-win'), 1500);
          }
        });
      }
      run(list, from, to, ms, ease, endIdx, onStep) {
        return new Promise(done => {
          const start = performance.now(), pt = this.pitch();
          let prevY = from, lastIdx = 0, near = null;
          this.track.style.transform = `translate3d(0,${from}px,0)`;
          const frame = now => {
            const t = Math.min(1, (now - start) / ms), y = from + (to - from) * ease(t);
            if (onStep) {
              const idx = Math.round(-y / pt);
              if (idx !== lastIdx && idx >= 0) {
                lastIdx = idx;
                near?.classList.remove('is-near');
                near = this.track.children[idx + 3]?.firstElementChild;
                near?.classList.add('is-near');
                onStep();
              }
            }
            prevY = y;
            this.track.style.transform = `translate3d(0,${y}px,0)`;
            if (t < 1) return requestAnimationFrame(frame);
            this.view = list.slice(endIdx, endIdx + 7);
            this.render(this.view);
            this.track.style.transform = '';
            done();
          };
          requestAnimationFrame(frame);
        });
      }
      async spin(forcePrize) {
        const N = SPIN_CARDS, p = this.pitch();
        const fresh = sequence(this.view, N, N - 4, forcePrize), win = fresh[N - 4];
        const list = [...this.view, ...fresh];
        this.setBusy(true); Sound.whoosh();
        this.focusCard()?.classList.remove('is-focus', 'is-win');
        this.root.classList.add('is-spinning');
        this.track.insertAdjacentHTML('beforeend', fresh.map(PrizeCard).join(''));
        try {
          await this.run(list, 0, -N * p, SPIN_MS, easeSpin, N, () => Sound.tick());
        } finally {
          this.root.classList.remove('is-spinning');
        }
        this.settle(true); this.setBusy(false);
        return win;
      }
      async move(dir) {
        if (this.busy) return;
        const p = this.pitch(), fresh = dir > 0 ? sequence(this.view, 1)[0] : pickFrom(this.view.slice(0, 5).map(x => x.base));
        this.setBusy(true); Sound.ui('nav'); this.focusCard()?.classList.remove('is-focus');
        let list;
        if (dir > 0) {
          list = [...this.view, fresh];
          this.track.insertAdjacentHTML('beforeend', PrizeCard(fresh));
          await this.run(list, 0, -p, 420, easeOutQuart, 1);
        } else {
          list = [fresh, ...this.view];
          this.track.insertAdjacentHTML('afterbegin', PrizeCard(fresh));
          await this.run(list, -p, 0, 420, easeOutQuart, 0);
        }
        this.settle(false); this.setBusy(false);
      }
    }

    const getCurrentBalance = () => userRef.current?.balance ?? userRef.current?.cryptoBalances?.USDT ?? 0;

    class BalancePanel {
      constructor() {
        this.el = document.createElement('div');
        this.el.className = 'balance';
        this.el.innerHTML = `${Coin()}<div><strong>Balance <span id="spin-bal">${fmt(getCurrentBalance())}</span> USDT</strong><button type="button" id="deposit-btn">Deposit &rsaquo;</button></div>`;
        this.el.querySelector('#deposit-btn').onclick = () => navigateRef.current('/deposit');
        balancePanelRef.current = this;
      }
      update(val) {
        const el = this.el.querySelector('#spin-bal');
        if (el) el.textContent = fmt(val);
      }
    }

    class BetControls {
      constructor(tiers, start, onChange) {
        this.tiers = tiers; this.value = start; this.onChange = onChange;
        this.el = document.createElement('div'); this.el.className = 'bet';
        this.el.innerHTML = `<div class="bet__row"><button class="bet__step" data-dir="-1" type="button" aria-label="Decrease bet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg></button><div class="bet__value"><span>$${this.value}</span></div><button class="bet__step" data-dir="1" type="button" aria-label="Increase bet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></button></div><small>Royal: $${getRoyalPrize(this.value)}</small>`;
        [this.minus, this.plus] = this.el.querySelectorAll('.bet__step');
        this.valEl = this.el.querySelector('.bet__value span');
        this.royalLabel = this.el.querySelector('small');
        this.minus.onclick = () => this.step(-1);
        this.plus.onclick = () => this.step(1);
        this.updateButtons();
      }
      step(dir) {
        if (reel.busy) return;
        Sound.init();
        const currentIdx = this.tiers.indexOf(this.value);
        let nextIdx = currentIdx + dir;
        if (nextIdx < 0) nextIdx = 0;
        if (nextIdx >= this.tiers.length) nextIdx = this.tiers.length - 1;
        if (nextIdx === currentIdx) return;
        const nextVal = this.tiers[nextIdx];
        Sound.ui(dir > 0 ? 'up' : 'down');
        this.value = nextVal;
        this.valEl.textContent = `$${this.value}`;
        this.royalLabel.textContent = `Royal: $${getRoyalPrize(this.value)}`;
        this.updateButtons();
        this.onChange(this.value);
      }
      updateButtons() {
        const idx = this.tiers.indexOf(this.value);
        this.minus.disabled = idx <= 0;
        this.plus.disabled = idx >= this.tiers.length - 1;
      }
    }

    class SpinActions {
      constructor(getBet, onSpin, onAuto) {
        this.getBet = getBet;
        this.el = document.createElement('div'); this.el.className = 'actions';
        this.el.innerHTML = `<button class="act auto" type="button" aria-pressed="false"><span class="auto__dot"></span>Auto-Spin</button><button class="act spin" type="button"></button>`;
        [this.auto, this.spin] = this.el.children;
        this.spin.onclick = onSpin;
        this.auto.onclick = () => {
          const on = this.auto.getAttribute('aria-pressed') !== 'true';
          this.auto.setAttribute('aria-pressed', on);
          Sound.init(); Sound.ui(on ? 'up' : 'down');
          onAuto(on);
        };
        this.paint(false);
      }
      paint(busy) {
        this.spin.disabled = busy;
        if (isFreeSpinAvailable) {
          this.spin.classList.add('is-free');
          this.spin.textContent = busy ? 'Spinning Free...' : '🎁 Claim Free Spin ($0)';
        } else {
          this.spin.classList.remove('is-free');
          this.spin.textContent = busy ? 'Spinning...' : `Spin for $${this.getBet()}`;
        }
      }
    }

    const reel = new PrizeReel(rootEl.querySelector('#reel-mount'));
    const announce = rootEl.querySelector('#announce');
    let autoOn = false;

    function setEconomy(v) {
      const oldBet = Econ.bet;
      if (oldBet === v) return;
      const was = Econ.vip;
      Econ.vip = v >= VIP_AT;
      Econ.bet = v;
      Econ.mult = v;
      if (Econ.vip && !was) { Sound.vip(); announce.textContent = PACK_NAME + ' prize unlocked'; }
      reel.smoothUpdateBet(oldBet, v);
    }

    const growFor = v => ((v - BET_MIN) / Math.max(1, BET_MAX - BET_MIN)) * .3;
    const bet = new BetControls(BET_TIERS, 1, v => {
      reel.setGrow(growFor(v));
      setEconomy(v);
      if (!reel.busy) actions.paint(false);
    });
    const actions = new SpinActions(() => bet.value, () => {
      Sound.init(); Sound.ui('press'); runSpin();
    }, on => {
      autoOn = on; if (on && !reel.busy) runSpin();
    });
    const balance = new BalancePanel();
    reel.setGrow(growFor(bet.value));

    const speaker = document.createElement('button');
    speaker.className = 'sound'; speaker.type = 'button'; speaker.setAttribute('aria-pressed', 'true'); speaker.setAttribute('aria-label', 'Sound');
    const paintSpeaker = () => {
      speaker.setAttribute('aria-pressed', Sound.on);
      speaker.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/>${Sound.on ? '<path d="M16.500 9a4 4 0 0 1 0 6M19 6.500a8 8 0 0 1 0 11"/>' : '<path d="M17 9.500l4 5M21 9.500l-4 5"/>'}</svg>`;
    };
    speaker.onclick = () => { Sound.on = !Sound.on; if (Sound.on) { Sound.init(); Sound.tick(); } paintSpeaker(); };
    paintSpeaker(); reel.root.append(speaker);

    // Referral link builder for Story and direct share
    const botUser = 'CryptoArbitrageBot';
    const currentRefId = userRef.current?.telegramId || userRef.current?.id || 'guest';
    const refCode = userRef.current?.referralCode || `ref_${currentRefId}`;
    const inviteUrl = `https://t.me/${botUser}?startapp=${refCode}`;

    const panel = document.createElement('section');
    panel.className = 'panel'; panel.setAttribute('aria-label', 'Controls');

    // Free spin banner element
    const freeBanner = document.createElement('div');
    freeBanner.className = 'free-banner';
    freeBanner.innerHTML = `<span>🎁 1 Free Spin Available!</span><small>Min. withdrawal $5.00</small>`;
    if (isFreeSpinAvailable) panel.append(freeBanner);

    const row = document.createElement('div'); row.className = 'panel__row';
    row.append(balance.el, bet.el);
    panel.append(row, actions.el);

    // Referral & Telegram Story Strip
    const refStrip = document.createElement('div');
    refStrip.className = 'referral-strip';
    refStrip.innerHTML = `<p>🚀 Invite friends for more spins!</p><div class="ref-btns"><button class="ref-btn-story" type="button">📲 Story</button><button class="ref-btn-copy" type="button">📋 Copy</button></div>`;
    
    refStrip.querySelector('.ref-btn-story').onclick = () => {
      Sound.init(); Sound.ui('press');
      const shareText = "🎰 I just claimed my free USDT on Arbix Lucky Spin! Spin now & win up to 2,000 USDT:\n" + inviteUrl;
      const shareLink = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.shareToStory) {
          tg.shareToStory({ widget_link: { url: inviteUrl, name: "Play Lucky Spin" } });
        } else if (tg?.openTelegramLink) {
          tg.openTelegramLink(shareLink);
        } else {
          window.open(shareLink, '_blank');
        }
      } catch {
        window.open(shareLink, '_blank');
      }
    };

    refStrip.querySelector('.ref-btn-copy').onclick = (e: any) => {
      Sound.init(); Sound.ui('press');
      navigator.clipboard.writeText(inviteUrl);
      const originalText = e.target.textContent;
      e.target.textContent = '✓ Copied';
      setTimeout(() => { e.target.textContent = originalText; }, 2000);
    };

    panel.append(refStrip);
    rootEl.querySelector('#panel-mount').replaceWith(panel);

    reel.onBusy = b => {
      actions.paint(b);
      bet.minus.disabled = b || bet.value <= BET_TIERS[0];
      bet.plus.disabled = b || bet.value >= BET_TIERS[BET_TIERS.length - 1];
    };

    // Fast, lightweight win celebration modal
    const Jackpot = {
      el: rootEl.querySelector('#jackpot'),
      show(prize, customSub = '') {
        return new Promise(res => {
          const el = this.el, g = prize.tier === 'gold';
          el.dataset.tier = prize.tier;
          el.querySelector('.jackpot__label').textContent = isFreeSpinAvailable ? '🎁 Welcome Free Prize!' : g ? PACK_NAME + ' Prize!' : 'You Won!';
          el.querySelector('.jackpot__sub').textContent = customSub;
          const card = el.querySelector('.jackpot__card');
          card.innerHTML = PrizeCard(prize).replace('class="ticket', 'class="ticket is-win' + (g ? ' is-vip' : ''));
          el.setAttribute('aria-hidden', 'false');
          el.classList.add('is-on');
          if (g) Sound.vip(); else Sound.win(prize.tier);
          navigator.vibrate?.([30, 40, 70]);

          const close = () => {
            clearTimeout(timer);
            el.classList.remove('is-on');
            el.setAttribute('aria-hidden', 'true');
            el.removeEventListener('click', close);
            document.removeEventListener('keydown', key);
            setTimeout(res, 300);
          };
          const key = e => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
          const timer = setTimeout(close, 4500);
          el.querySelector('.jackpot__close').onclick = close;
          el.addEventListener('click', close);
          document.addEventListener('keydown', key);
        });
      }
    };

    // Real spin execution engine with 1 Free Spin capability
    async function runSpin() {
      if (reel.busy) return;
      const isFree = isFreeSpinAvailable;
      const bal = getCurrentBalance();
      const cost = isFree ? 0 : bet.value;

      if (!isFree) {
        if (typeof cost !== 'number' || isNaN(cost) || !BET_TIERS.includes(cost)) {
          announce.textContent = 'Security Error: Unauthorized bet.';
          Sound.ui('dud');
          return;
        }
        if (bal < cost) {
          announce.textContent = 'Insufficient balance! Please deposit USDT.';
          Sound.ui('dud');
          autoOn = false;
          actions.auto.setAttribute('aria-pressed', 'false');
          return;
        }
      }

      Sound.init();
      // Deduct balance atomically if not free spin
      if (!isFree && cost > 0 && typeof creditRef.current === 'function') {
        await creditRef.current(-cost, 'USDT');
      }
      balance.update(getCurrentBalance());

      // If free spin: land on 1.25 USDT!
      let forcedPrize = null;
      if (isFree) {
        forcedPrize = { base: 1.25, tier: 'teal' };
      }

      const win = await reel.spin(forcedPrize);
      const reward = isFree ? 1.25 : (win.tier === 'gold' ? getRoyalPrize(Econ.bet) : Number((win.base * Econ.mult).toFixed(2)));

      // Credit winnings
      if (reward > 0 && typeof creditRef.current === 'function') {
        await creditRef.current(reward, 'USDT');
      }
      balance.update(getCurrentBalance());

      if (isFree) {
        localStorage.setItem(freeSpinKey, 'true');
        isFreeSpinAvailable = false;
        freeBanner.remove();
        actions.paint(false);
        await Jackpot.show(win, '1.25 USDT added to your balance! (Min. withdrawal: $5.00. Deposit or play to withdraw)');
      } else {
        announce.textContent = `You won ${fmt(reward)} Tether`;
        await Jackpot.show(win);
      }

      if (autoOn) setTimeout(() => { if (autoOn && !reel.busy) runSpin(); }, 1600);
    }
  }, []);

  const vars: any = {
    display: "block",
    width: "100%",
    height: "var(--spin-h, 100dvh)",
    position: "relative",
    ...(height !== undefined ? { "--spin-h": typeof height === "number" ? height + "px" : height } : {}),
    ...style,
  };

  return (
    <div 
      ref={host} 
      className={className} 
      style={vars}
    >
      <button 
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/15 transition-all shadow-lg active:scale-95"
        aria-label="Go back"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}

export default Spin;
