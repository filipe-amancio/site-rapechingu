(function () {
  "use strict";

  /* ---------- Age gate ---------- */
  var AGE_KEY = "rapexingu_age_ok";
  var ageGate = document.getElementById("ageGate");
  var ageConfirm = document.getElementById("ageConfirm");
  var ageDeny = document.getElementById("ageDeny");

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
  }
  function unlockScroll() {
    document.documentElement.style.overflow = "";
  }

  function hasConfirmedAge() {
    try {
      return sessionStorage.getItem(AGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  if (ageGate) {
    if (hasConfirmedAge()) {
      ageGate.hidden = true;
    } else {
      lockScroll();
    }

    ageConfirm.addEventListener("click", function () {
      try {
        sessionStorage.setItem(AGE_KEY, "1");
      } catch (e) {}
      ageGate.hidden = true;
      unlockScroll();
    });

    ageDeny.addEventListener("click", function (e) {
      // Deixa o link seguir normalmente (sai do site), sem alterações extras.
    });
  }

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 24) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  function closeMobileNav() {
    mobileNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    unlockScroll();
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        lockScroll();
      } else {
        unlockScroll();
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });
  }

  /* ---------- Product filter tabs ---------- */
  var tabs = document.querySelectorAll(".line-tab");
  var cards = document.querySelectorAll("#productGrid .product-card");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      var filter = tab.getAttribute("data-filter");
      cards.forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-cat") === filter;
        card.style.display = match ? "" : "none";
      });
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  /* ---------- Logo: remove o fundo e tinge a arte na cor da marca ----------
     A arte vem como traço claro sobre fundo escuro (ou o inverso). Convertemos
     por canvas: a luminância de cada pixel vira sua transparência — o traço
     fica opaco na cor creme da marca, o fundo (claro ou escuro, conforme
     `invert`) vira transparente — sem depender de recorte fixo. */
  function tintMarkFromLuminance(img, color, invert) {
    return new Promise(function (resolve) {
      function process() {
        try {
          var w = img.naturalWidth;
          var h = img.naturalHeight;
          if (!w || !h) {
            resolve(false);
            return;
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          var imgData = ctx.getImageData(0, 0, w, h);
          var data = imgData.data;

          for (var p = 0; p < data.length; p += 4) {
            var lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
            data[p] = color[0];
            data[p + 1] = color[1];
            data[p + 2] = color[2];
            data[p + 3] = invert ? lum : 255 - lum;
          }

          ctx.putImageData(imgData, 0, 0);
          img.src = canvas.toDataURL("image/png");
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      }

      if (img.complete && img.naturalWidth) {
        process();
      } else {
        img.addEventListener("load", process, { once: true });
        img.addEventListener("error", function () {
          resolve(false);
        }, { once: true });
      }
    });
  }

  document.querySelectorAll(".logo .mark").forEach(function (img) {
    tintMarkFromLuminance(img, [244, 229, 174], true);
  });

  /* ---------- Carrinho ---------- */
  var CART_KEY = "rapexingu_cart";
  var WHATSAPP_NUMBER = "5561981304906";

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
  }

  var cart = loadCart();

  // Carrinhos salvos antes da tabela de preços existir não têm "price" —
  // preenche com o valor atual do produto pra não gerar NaN no total.
  Object.keys(cart).forEach(function (name) {
    if (typeof cart[name].price !== "number" || isNaN(cart[name].price)) {
      cart[name].price = findShopItemPrice(name);
    }
  });

  var cartToggle = document.getElementById("cartToggle");
  var cartClose = document.getElementById("cartClose");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartBody = document.getElementById("cartBody");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartList = document.getElementById("cartList");
  var cartCount = document.getElementById("cartCount");
  var cartTotalQty = document.getElementById("cartTotalQty");
  var cartTotalValue = document.getElementById("cartTotalValue");
  var cartCheckout = document.getElementById("cartCheckout");

  function cartTotalItems() {
    var total = 0;
    Object.keys(cart).forEach(function (key) {
      total += cart[key].qty;
    });
    return total;
  }

  function cartTotalValueBRL() {
    var total = 0;
    Object.keys(cart).forEach(function (key) {
      total += cart[key].qty * cart[key].price;
    });
    return total;
  }

  function formatBRL(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }

  function findShopItemImg(name) {
    var item = document.querySelector('.shop-item[data-name="' + CSS.escape(name) + '"]');
    var img = item ? item.querySelector("img") : null;
    return img ? img.src : "";
  }

  function findShopItemPrice(name) {
    var item = document.querySelector('.shop-item[data-name="' + CSS.escape(name) + '"]');
    var price = item ? parseFloat(item.getAttribute("data-price")) : NaN;
    return isNaN(price) ? 0 : price;
  }

  function renderCart() {
    var keys = Object.keys(cart).filter(function (k) {
      return cart[k].qty > 0;
    });
    var total = cartTotalItems();

    if (cartCount) {
      cartCount.textContent = String(total);
      cartCount.hidden = total === 0;
    }
    if (cartTotalQty) {
      cartTotalQty.textContent = String(total);
    }
    if (cartTotalValue) {
      cartTotalValue.textContent = formatBRL(cartTotalValueBRL());
    }

    if (!cartList || !cartEmpty) return;

    if (keys.length === 0) {
      cartEmpty.hidden = false;
      cartList.innerHTML = "";
      if (cartCheckout) cartCheckout.setAttribute("aria-disabled", "true");
      return;
    }

    cartEmpty.hidden = true;
    if (cartCheckout) cartCheckout.removeAttribute("aria-disabled");

    cartList.innerHTML = keys
      .map(function (name) {
        var entry = cart[name];
        var subtotal = entry.qty * entry.price;
        return (
          '<li class="cart-item" data-name="' + escapeHtml(name) + '">' +
          '<img src="' + entry.img + '" alt="" loading="lazy" />' +
          '<div class="cart-item-info"><strong>' + escapeHtml(name) + "</strong><span>" +
          entry.qty + " tubo" + (entry.qty > 1 ? "s" : "") + " (" + entry.qty * 12 + " latinhas) · " + formatBRL(subtotal) +
          "</span></div>" +
          '<button type="button" class="cart-item-remove" data-remove="' + escapeHtml(name) + '" aria-label="Remover ' + escapeHtml(name) + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          "</button>" +
          "</li>"
        );
      })
      .join("");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function syncCardDisplay(name) {
    var entry = cart[name];
    var qty = entry ? entry.qty : 0;
    document.querySelectorAll('.shop-item[data-name="' + CSS.escape(name) + '"]').forEach(function (item) {
      var qtyBox = item.querySelector(".qty");
      var qtyInput = item.querySelector(".qty-input");
      if (qtyBox) qtyBox.setAttribute("data-qty", String(qty));
      if (qtyInput && qtyInput !== document.activeElement) {
        qtyInput.value = String(qty);
      }
      if (qtyInput) {
        qtyInput.classList.toggle("active", qty > 0);
      }
      item.classList.toggle("in-cart", qty > 0);
    });
  }

  function setQty(name, line, qty) {
    qty = Math.max(0, qty);
    if (qty === 0) {
      delete cart[name];
    } else {
      cart[name] = { qty: qty, line: line, img: findShopItemImg(name), price: findShopItemPrice(name) };
    }
    saveCart(cart);
    syncCardDisplay(name);
    renderCart();
  }

  document.querySelectorAll(".shop-item").forEach(function (item) {
    var name = item.getAttribute("data-name");
    var existing = cart[name];
    if (existing) {
      syncCardDisplay(name);
    }
  });

  var QTY_DELTAS = { inc: 1, dec: -1, inc10: 10, dec10: -10 };

  document.querySelectorAll(".shop-item .qty-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".shop-item");
      if (!item) return;
      var name = item.getAttribute("data-name");
      var line = item.getAttribute("data-line");
      var current = cart[name] ? cart[name].qty : 0;
      var delta = QTY_DELTAS[btn.getAttribute("data-action")] || 0;
      setQty(name, line, current + delta);
    });
  });

  /* Digitar a quantidade direto no campo — essencial pra pedidos grandes
     (varejo), onde clicar em "+" uma unidade de cada vez não é viável. */
  document.querySelectorAll(".shop-item .qty-input").forEach(function (input) {
    input.addEventListener("focus", function () {
      input.select();
    });

    input.addEventListener("input", function () {
      var item = input.closest(".shop-item");
      if (!item) return;
      var name = item.getAttribute("data-name");
      var line = item.getAttribute("data-line");
      var parsed = parseInt(input.value, 10);
      if (isNaN(parsed) || parsed < 0) parsed = 0;
      setQty(name, line, parsed);
    });

    input.addEventListener("blur", function () {
      var item = input.closest(".shop-item");
      if (!item) return;
      var name = item.getAttribute("data-name");
      input.value = String(cart[name] ? cart[name].qty : 0);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") input.blur();
    });
  });

  if (cartList) {
    cartList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove]");
      if (!btn) return;
      var name = btn.getAttribute("data-remove");
      setQty(name, null, 0);
    });
  }

  function openCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartBackdrop.hidden = false;
    cartDrawer.hidden = false;
    lockScroll();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cartBackdrop.classList.add("open");
        cartDrawer.classList.add("open");
      });
    });
  }

  function closeCart() {
    if (!cartDrawer || !cartBackdrop) return;
    cartBackdrop.classList.remove("open");
    cartDrawer.classList.remove("open");
    unlockScroll();
    setTimeout(function () {
      cartBackdrop.hidden = true;
      cartDrawer.hidden = true;
    }, 350);
  }

  if (cartToggle) cartToggle.addEventListener("click", openCart);
  if (cartClose) cartClose.addEventListener("click", closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cartDrawer && cartDrawer.classList.contains("open")) {
      closeCart();
    }
  });

  if (cartCheckout) {
    cartCheckout.addEventListener("click", function (e) {
      var keys = Object.keys(cart).filter(function (k) {
        return cart[k].qty > 0;
      });
      if (keys.length === 0) {
        e.preventDefault();
        return;
      }
      var totalTubos = 0;
      var totalValor = 0;
      var lines = keys.map(function (name) {
        var entry = cart[name];
        var subtotal = entry.qty * entry.price;
        totalTubos += entry.qty;
        totalValor += subtotal;
        return (
          "• " + entry.qty + " tubo" + (entry.qty > 1 ? "s" : "") + " de " + name +
          " (" + entry.line + ") — " + entry.qty * 12 + " latinhas — " + formatBRL(subtotal)
        );
      });
      var message =
        "Olá! Vim pelo site e quero fazer este pedido (venda por tubo, 12 latinhas cada):\n\n" +
        lines.join("\n") +
        "\n\nTotal: " + totalTubos + " tubo" + (totalTubos > 1 ? "s" : "") + " (" + totalTubos * 12 + " latinhas) — " + formatBRL(totalValor) +
        "\n\nPode confirmar esse valor, formas de pagamento e prazo de entrega?";
      cartCheckout.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    });
  }

  renderCart();

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
