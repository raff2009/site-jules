/* =========================================================
   RÉGLAGES : change uniquement cette partie
   ========================================================= */
const CONFIG = {
  marque: "Marque",                       // nom de la marque (en haut à gauche) : à remplacer quand vous l'aurez
  nom: "Plaque Avis NFC",                 // nom du produit
  slogan: "Un geste. Un avis.",           // phrase sous le titre
  motGeant: "NFC",                        // le gros mot brillant derrière la plaque (3 à 5 lettres)
  description: "Une plaque à poser dans votre commerce. Vos clients approchent leur téléphone et arrivent directement sur votre page d'avis.",
  prix: 35,                               // prix en euros (avec un point si besoin, ex : 34.90)
  createurNom: "Prénom Nom",
  createurRole: "Créateur",
  email: "contact@exemple.fr",
  livraison: 0,                           // frais de livraison en euros (0 = "Offerte")
  quantiteMax: 20,                        // nombre maximum de plaques par commande
  lienPaiement: ""                        // ton lien de paiement Stripe (voir explications). Vide = paiement pas encore actif
};

/* =========================================================
   À partir d'ici, pas besoin de toucher
   ========================================================= */
const euro = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/* ---------- Remplit les textes ---------- */
document.querySelectorAll("[data-config]").forEach(el => {
  const key = el.dataset.config;
  if (key === "prix") el.textContent = euro(CONFIG.prix);
  else if (CONFIG[key] !== undefined) el.textContent = CONFIG[key];
});
document.title = `${CONFIG.nom} | ${CONFIG.marque}`;
document.querySelectorAll("[data-mail]").forEach(a => {
  a.href = "mailto:" + CONFIG.email;
  a.textContent = CONFIG.email;
});
document.querySelectorAll("[data-mail-link]").forEach(a => (a.href = "mailto:" + CONFIG.email));
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Plaque dessinée dans l'animation ---------- */
document.querySelectorAll(".demo-plaque").forEach(el => (el.innerHTML = PLAQUE_HTML));

/* ---------- Photos déjà en erreur avant le chargement du script ---------- */
document.querySelectorAll("img[onerror]").forEach(img => {
  if (img.complete && img.naturalWidth === 0) imgFallback(img);
});

/* ---------- Menu téléphone ---------- */
const nav = document.getElementById("nav");
document.getElementById("burger").addEventListener("click", () => nav.classList.toggle("open"));
document.querySelectorAll(".nav-links a").forEach(a =>
  a.addEventListener("click", () => nav.classList.remove("open"))
);

/* ---------- Apparitions au scroll ---------- */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

/* ---------- L'animation démarre quand on la voit ---------- */
const demo = document.querySelector(".demo");
new IntersectionObserver(entries => {
  entries.forEach(e => demo.classList.toggle("playing", e.isIntersecting));
}, { threshold: 0.3 }).observe(demo);

/* ---------- Effet de profondeur sur le premier bloc ---------- */
const stage = document.querySelector(".hero-stage");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let ticking = false;

function onScroll() {
  if (ticking || reduceMotion) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    if (y < innerHeight * 1.2) {
      stage.style.transform = `translateY(${y * 0.18}px) scale(${1 - y * 0.00012})`;
      stage.style.opacity = Math.max(0, 1 - y / (innerHeight * 1.1));
    }
    ticking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });

/* ---------- Date de livraison estimée ---------- */
function addWorkingDays(date, n) {
  const d = new Date(date);
  while (n > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n--;
  }
  return d;
}
const fmt = d => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
document.getElementById("delivery").textContent =
  `Livraison estimée entre le ${fmt(addWorkingDays(new Date(), 3))} et le ${fmt(addWorkingDays(new Date(), 5))}`;

/* =========================================================
   PANIER
   ========================================================= */
const $ = id => document.getElementById(id);
const MAX = CONFIG.quantiteMax;

/* Le panier est gardé dans le navigateur : si on recharge la page, il est toujours là */
const STORE_KEY = "panier-plaque";
function loadCart() {
  try {
    const n = parseInt(localStorage.getItem(STORE_KEY), 10);
    return Number.isFinite(n) && n > 0 ? Math.min(n, MAX) : 0;
  } catch (e) { return 0; }
}
function saveCart() {
  try { localStorage.setItem(STORE_KEY, String(cartQty)); } catch (e) {}
}

let pageQty = 1;          // quantité choisie dans la zone "Acheter"
let cartQty = loadCart(); // quantité dans le panier

/* ---------- Sélecteur de quantité sur la page ---------- */
const qtyValue = $("qtyValue"), minus = $("minus"), plus = $("plus"), total = $("total"), addBtn = $("addBtn");

function renderPageQty() {
  qtyValue.textContent = pageQty;
  minus.disabled = pageQty <= 1;
  plus.disabled = pageQty >= MAX;
  total.textContent = euro(CONFIG.prix * pageQty);
}
minus.addEventListener("click", () => { if (pageQty > 1) { pageQty--; renderPageQty(); } });
plus.addEventListener("click", () => { if (pageQty < MAX) { pageQty++; renderPageQty(); } });
renderPageQty();

/* ---------- Panneau du panier ---------- */
const cart = $("cart"), overlay = $("cartOverlay");
const bag = $("bag"), bagCount = $("bagCount");

function shippingCost() {
  return cartQty === 0 ? 0 : CONFIG.livraison;
}

function renderCart() {
  const filled = cartQty > 0;
  $("cartEmpty").style.display = filled ? "none" : "";
  $("cartFilled").style.display = filled ? "" : "none";

  const subtotal = CONFIG.prix * cartQty;
  const ship = shippingCost();
  $("cartQty").textContent = cartQty;
  $("cartMinus").disabled = cartQty <= 1;
  $("cartPlus").disabled = cartQty >= MAX;
  $("cartLine").textContent = euro(subtotal);
  $("cartSubtotal").textContent = euro(subtotal);
  $("cartShipping").textContent = ship === 0 ? "Offerte" : euro(ship);
  $("cartTotal").textContent = euro(subtotal + ship);

  bagCount.textContent = cartQty;
  bagCount.classList.toggle("show", filled);
  saveCart();
}

function openCart() {
  cart.classList.add("open");
  overlay.classList.add("open");
  cart.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}
function closeCart() {
  cart.classList.remove("open");
  overlay.classList.remove("open");
  cart.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

/* Petite image dans le panier : la photo si elle existe, sinon la plaque dessinée */
(function cartThumb() {
  const box = $("cartThumb");
  const img = new Image();
  img.alt = CONFIG.nom;
  img.onload = () => { box.innerHTML = ""; box.appendChild(img); };
  img.onerror = () => { box.innerHTML = '<div class="plaque-wrap plaque-mini">' + PLAQUE_HTML + "</div>"; };
  img.src = "images/produit.png";
})();

/* Ajouter au panier */
addBtn.addEventListener("click", () => {
  const before = cartQty;
  cartQty = Math.min(MAX, cartQty + pageQty);
  renderCart();

  bag.classList.remove("bump");
  void bag.offsetWidth;
  bag.classList.add("bump");

  if (cartQty === before) showToast(`Maximum ${MAX} par commande`);
  addBtn.textContent = "Ajoutée ✓";
  addBtn.classList.add("done");
  setTimeout(() => {
    addBtn.textContent = "Ajouter au panier";
    addBtn.classList.remove("done");
  }, 1500);

  pageQty = 1;
  renderPageQty();
  setTimeout(openCart, 350);
});

/* Boutons du panier */
$("cartPlus").addEventListener("click", () => { if (cartQty < MAX) { cartQty++; renderCart(); } });
$("cartMinus").addEventListener("click", () => { if (cartQty > 1) { cartQty--; renderCart(); } });
$("cartRemove").addEventListener("click", () => { cartQty = 0; renderCart(); });
$("cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
addEventListener("keydown", e => { if (e.key === "Escape") closeCart(); });
bag.addEventListener("click", openCart);
$("cartShop").addEventListener("click", () => {
  closeCart();
  $("acheter").scrollIntoView({ behavior: "smooth" });
});

/* Commander */
$("checkoutBtn").addEventListener("click", () => {
  if (!CONFIG.lienPaiement) {
    showToast("Le paiement en ligne sera bientôt disponible");
    return;
  }
  window.location.href = CONFIG.lienPaiement;
});

/* ---------- Petite notification ---------- */
const toast = $("toast"), toastText = $("toastText");
let toastTimer;
function showToast(text) {
  toastText.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

renderCart();
