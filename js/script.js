const PRODUCT_CATALOG = [
    { id: 1, name: 'Premium Hoodie', category: 'hoodies', price: 584, image: 'assets/images/products/premium-hoodie.webp', description: 'Prelude drop staple with brushed fleece and a clean drape.' },
    { id: 2, name: 'Designer Hoodie', category: 'hoodies', price: 779, image: 'assets/images/products/designer-hoodie.webp', description: 'Sharp panel lines, deep hood, and all-day soft interior.' },
    { id: 3, name: 'Oversized Hoodie', category: 'hoodies', price: 714, image: 'assets/images/products/oversized-hoodie.webp', description: 'Loose city fit built for layering and statement sneakers.' },
    { id: 4, name: 'Zip-Up Hoodie', category: 'hoodies', price: 617, image: 'assets/images/products/zip-up-hoodie.webp', description: 'Lightweight zip profile for quick throw-on street style.' },
    { id: 5, name: 'Classic Tee', category: 'tshirts', price: 324, image: 'assets/images/products/classic-tee.webp', description: 'Essential Prelude tee with premium combed cotton touch.' },
    { id: 6, name: 'Graphic Tee', category: 'tshirts', price: 357, image: 'assets/images/products/graphic-tee.webp', description: 'Bold front graphic made to carry your whole outfit.' },
    { id: 7, name: 'Vintage Tee', category: 'tshirts', price: 389, image: 'assets/images/products/vintage-tee.webp', description: 'Soft washed texture with a throwback tone and modern cut.' },
    { id: 8, name: 'Long Sleeve Tee', category: 'tshirts', price: 422, image: 'assets/images/products/long-sleeve-tee.webp', description: 'Layer-ready long sleeve that works from day to night.' },
    { id: 9, name: 'Classic Midstar Jeans', category: 'pants', price: 1049, image: 'assets/images/products/dark-wash-crbftn-jeans.webp', description: 'Dark wash denim with a refined taper for everyday rotation.' },
    { id: 10, name: 'Raw Denim Jeans', category: 'pants', price: 1039, image: 'assets/images/products/raw-denim-crbftn-jeans.webp', description: 'Structured raw denim that develops character over time.' },
    { id: 11, name: 'Baggy Jeans', category: 'pants', price: 1124, image: 'assets/images/products/baggy-crbftn-jeans.webp', description: 'Roomy street silhouette with confident throwback energy.' },
    { id: 12, name: 'Cargo Pants', category: 'pants', price: 649, image: 'assets/images/products/cargo-pants.webp', description: 'Utility pockets and tapered leg for practical flex.' },
    { id: 13, name: 'Street King Cargo', category: 'pants', price: 1199, image: 'assets/images/products/street-king-cargo-pants.webp', description: 'Premium heavy cargo built to lead every look.' },
    { id: 14, name: 'Bomber Jacket', category: 'jackets', price: 1169, image: 'assets/images/products/crbftn-bomber-jacket.webp', description: 'Core Prelude bomber with a smooth shell and plush lining.' },
    { id: 15, name: 'Urban Wind Breaker', category: 'jackets', price: 974, image: 'assets/images/products/urban-wind-breaker.webp', description: 'Feather-light protection for windy commutes and late rides.' },
    { id: 16, name: 'Track Jacket', category: 'jackets', price: 1087, image: 'assets/images/products/crbftn-track-jacket.webp', description: 'Sport-inspired profile with flexible movement and polish.' },
    { id: 17, name: 'Varsity Jacket', category: 'jackets', price: 1199, image: 'assets/images/products/crbftn-varsity-jacket.webp', description: 'Classic varsity attitude reworked for the Prelude era.' }
];

let currentFilter = 'all';

function getDiscountedPrice(price) {
    return Math.round(price * 0.65);
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('pmid_cart') || '[]');
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('pmid_cart', JSON.stringify(cart));
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bg = type === 'error' ? '#a83344' : '#24365f';
    toast.style.cssText = `position:fixed;right:16px;top:16px;z-index:5000;padding:10px 14px;border-radius:10px;background:${bg};color:#fff;border:1px solid rgba(255,255,255,0.2)`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

function renderProductCards(targetId, products) {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.innerHTML = products.map((product, index) => {
        const price = getDiscountedPrice(product.price);
        const isPriorityImage = index < 2;
        const loadingMode = isPriorityImage ? 'eager' : 'lazy';
        const fetchPriority = isPriorityImage ? 'high' : 'low';
        return `
            <article class="product-card hover-lift">
                <img src="${product.image}" alt="${product.name}" loading="${loadingMode}" decoding="async" fetchpriority="${fetchPriority}">
                <div style="padding:0.85rem;">
                    <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:start;">
                        <h3 style="margin:0;font-size:1rem;line-height:1.3;">${product.name}</h3>
                        <span style="font-size:0.72rem;color:#9db2ff;text-transform:capitalize;">${product.category}</span>
                    </div>
                    <p style="margin:0.45rem 0 0.7rem;color:var(--muted);font-size:0.86rem;min-height:2.3em;">${product.description}</p>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                        <div>
                            <div style="font-size:0.8rem;color:var(--muted);text-decoration:line-through;">R${product.price}</div>
                            <div style="font-weight:700;font-size:1.05rem;">R${price}</div>
                        </div>
                        <button class="btn-primary btn-add-to-cart" onclick="addToCart(${product.id})">Add</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function applyFilter(category) {
    currentFilter = category;
    const filtered = category === 'all' ? PRODUCT_CATALOG : PRODUCT_CATALOG.filter((p) => p.category === category);
    renderProductCards('products-grid', filtered);
    renderProductCards('landing-products-grid', filtered);

    document.querySelectorAll('[data-filter-btn]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.filterBtn === category);
    });
}

function addToCart(productId) {
    const product = PRODUCT_CATALOG.find((p) => p.id === productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find((item) => item.id === productId && item.size === 'M');
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, size: 'M', quantity: 1 });
    }
    saveCart(cart);
    updateCartUI();
    showToast(`${product.name} added to cart`);
}

function updateCartItem(productId, size, quantity) {
    let cart = getCart();
    if (quantity <= 0) {
        cart = cart.filter((item) => !(item.id === productId && item.size === size));
    } else {
        cart = cart.map((item) => (item.id === productId && item.size === size ? { ...item, quantity } : item));
    }
    saveCart(cart);
    updateCartUI();
}

function updateCartUI() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + getDiscountedPrice(item.price) * item.quantity, 0);

    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = String(count);

    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = `R${total.toFixed(2)}`;

    const itemsEl = document.getElementById('cart-items');
    if (itemsEl) {
        if (!cart.length) {
            itemsEl.innerHTML = '<p style="color:var(--muted)">Your cart is empty.</p>';
        } else {
            itemsEl.innerHTML = cart.map((item) => `
                <div style="display:flex;gap:0.75rem;border:1px solid var(--line);padding:0.6rem;border-radius:12px;align-items:center;">
                    <img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">
                    <div style="flex:1;">
                        <div style="font-size:0.9rem;font-weight:600;">${item.name}</div>
                        <div style="font-size:0.8rem;color:var(--muted);">R${getDiscountedPrice(item.price)} x ${item.quantity}</div>
                    </div>
                    <div style="display:flex;gap:0.3rem;">
                        <button class="btn-secondary" onclick="updateCartItem(${item.id}, '${item.size}', ${item.quantity - 1})">-</button>
                        <button class="btn-secondary" onclick="updateCartItem(${item.id}, '${item.size}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function toggleCart() {
    const overlay = document.getElementById('cart-overlay');
    if (!overlay) return;
    closeMobileMenu();
    overlay.classList.toggle('hidden');
}

function openCheckoutModal() {
    const cart = getCart();
    if (!cart.length) {
        showToast('Add products to cart first', 'error');
        return;
    }

    const checkoutOverlay = document.getElementById('checkout-overlay');
    if (!checkoutOverlay) return;

    checkoutOverlay.classList.remove('hidden');
}

function closeCheckoutModal() {
    const checkoutOverlay = document.getElementById('checkout-overlay');
    if (!checkoutOverlay) return;
    checkoutOverlay.classList.add('hidden');
}

function requestQuote() {
    if (!getCart().length) {
        showToast('Add products to cart first', 'error');
        return;
    }
    window.location.href = 'request-quote.html';
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu || menu.classList.contains('hidden')) return;

    menu.classList.add('hidden');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) {
        hamburgerBtn.setAttribute('aria-expanded', 'false');
    }
}

function mobileMenuToggle() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    const hamburgerBtn = document.getElementById('hamburger-btn');

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay && !cartOverlay.classList.contains('hidden')) {
        cartOverlay.classList.add('hidden');
    }

    menu.classList.toggle('hidden');
    if (hamburgerBtn) {
        const expanded = !menu.classList.contains('hidden');
        hamburgerBtn.setAttribute('aria-expanded', String(expanded));
    }
}

function handlePaymentReturnStatus() {
    const url = new URL(window.location.href);
    const paymentStatus = url.searchParams.get('payment');
    if (!paymentStatus) return;

    if (paymentStatus === 'success') {
        localStorage.removeItem('pmid_cart');
        updateCartUI();
        showToast('Payment successful. Thank you for your order.');
    } else if (paymentStatus === 'cancelled') {
        showToast('Payment was cancelled.', 'error');
    } else if (paymentStatus === 'error') {
        showToast('Payment failed. Please try again.', 'error');
    }

    url.searchParams.delete('payment');
    window.history.replaceState({}, document.title, url.toString());
}

function initHeroParallax() {
    const hero = document.querySelector('.hero-video-section');
    const heroVideo = document.querySelector('.hero-video');
    const heroContent = document.querySelector('.hero-parallax-content');
    if (!hero || !heroVideo || !heroContent) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;

    const updateParallax = () => {
        const rect = hero.getBoundingClientRect();
        const viewportH = window.innerHeight || 1;
        const progress = Math.max(-1, Math.min(1, (viewportH - rect.top) / (viewportH + rect.height)));

        const videoTranslate = (progress - 0.5) * 36;
        const contentTranslate = (progress - 0.5) * -18;

        heroVideo.style.transform = `translate3d(0, ${videoTranslate.toFixed(2)}px, 0) scale(1.08)`;
        heroContent.style.transform = `translate3d(0, ${contentTranslate.toFixed(2)}px, 0)`;

        ticking = false;
    };

    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    };

    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
}

async function submitOzowCheckout(event) {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
        showToast('Your cart is empty', 'error');
        return;
    }

    const form = event.target;
    const submitBtn = document.getElementById('checkout-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting to Ozow...';
    }

    const payload = {
        customer: {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value
        },
        items: cart.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            amount: getDiscountedPrice(i.price)
        })),
        totalAmount: cart.reduce((sum, i) => sum + getDiscountedPrice(i.price) * i.quantity, 0)
    };

    try {
        const res = await fetch('/.netlify/functions/create-ozow-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.paymentUrl) {
            throw new Error(data.error || 'Payment session could not be created');
        }

        window.location.href = data.paymentUrl;
    } catch (err) {
        showToast(err.message || 'Unable to start payment', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Proceed to Ozow';
        }
    }
}

window.mobileMenuToggle = mobileMenuToggle;
window.closeMobileMenu = closeMobileMenu;
window.toggleCart = toggleCart;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.submitOzowCheckout = submitOzowCheckout;
window.requestQuote = requestQuote;
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.applyFilter = applyFilter;

async function loadComponent(id, path) {
    const host = document.getElementById(id);
    if (!host) return;
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('component failed');
        host.innerHTML = await res.text();
    } catch {
        host.innerHTML = '';
    }
}

function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll('[data-nav]').forEach((link) => {
        link.classList.toggle('active', link.dataset.nav === page);
    });
}

function initFilters() {
    document.querySelectorAll('[data-filter-btn]').forEach((btn) => {
        btn.addEventListener('click', () => applyFilter(btn.dataset.filterBtn));
    });
}

function renderQuotePage() {
    const itemsList = document.getElementById('quote-items-list');
    const subtotalEl = document.getElementById('subtotal-display');
    const discountEl = document.getElementById('discount-display');
    const totalEl = document.getElementById('quote-total-display');
    const cart = getCart();

    if (!itemsList) return;

    if (!cart.length) {
        itemsList.innerHTML = '<p style="color:var(--muted)">No items yet. Add products first.</p>';
        if (subtotalEl) subtotalEl.textContent = 'R0.00';
        if (discountEl) discountEl.textContent = '-R0.00';
        if (totalEl) totalEl.textContent = 'R0.00';
        return;
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const discountedTotal = cart.reduce((sum, i) => sum + getDiscountedPrice(i.price) * i.quantity, 0);
    const discount = subtotal - discountedTotal;

    itemsList.innerHTML = cart.map((item) => `
        <div style="display:flex;justify-content:space-between;gap:0.5rem;padding:0.55rem 0;border-bottom:1px solid var(--line);">
            <span>${item.name} x ${item.quantity}</span>
            <strong>R${(getDiscountedPrice(item.price) * item.quantity).toFixed(2)}</strong>
        </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `R${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-R${discount.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `R${discountedTotal.toFixed(2)}`;
}

async function submitQuoteRequest(event) {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
        showToast('Cart is empty', 'error');
        return;
    }

    const form = event.target;
    const payload = {
        type: 'quote',
        customerInfo: {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            message: form.message.value || '',
            quoteId: `pmid-${Date.now()}`
        },
        items: cart.map((i) => ({
            name: i.name,
            size: i.size,
            quantity: i.quantity,
            price: getDiscountedPrice(i.price),
            total: getDiscountedPrice(i.price) * i.quantity
        })),
        totalAmount: cart.reduce((sum, i) => sum + getDiscountedPrice(i.price) * i.quantity, 0)
    };

    try {
        const res = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('send failed');
        showToast('Quote request sent successfully');
        localStorage.removeItem('pmid_cart');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    } catch {
        showToast('Could not send quote. Please try again.', 'error');
    }
}

window.submitQuoteRequest = submitQuoteRequest;

async function submitContactForm(event) {
    event.preventDefault();
    const form = event.target;
    const payload = {
        type: 'contact',
        formData: {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            email: form.email.value,
            subject: form.subject.value,
            message: form.message.value,
            timestamp: new Date().toISOString()
        }
    };

    try {
        const res = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('send failed');
        form.reset();
        showToast('Message sent. We will get back to you shortly.');
    } catch {
        showToast('Message failed to send. Please try again.', 'error');
    }
}

window.submitContactForm = submitContactForm;

document.addEventListener('DOMContentLoaded', async () => {
    await loadComponent('navigation-container', 'components/navigation.html');
    await loadComponent('footer-container', 'components/footer.html');
    await loadComponent('modals-container', 'components/modals.html');

    setActiveNav();
    initFilters();

    renderProductCards('landing-products-grid', PRODUCT_CATALOG);
    renderProductCards('products-grid', PRODUCT_CATALOG);
    updateCartUI();
    renderQuotePage();
    handlePaymentReturnStatus();
    initHeroParallax();

    document.querySelectorAll('#mobile-menu a').forEach((link) => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    const mobileMenu = document.getElementById('mobile-menu');
    const navBar = document.querySelector('.navbar-sticky');
    document.addEventListener('click', (event) => {
        if (!mobileMenu || !navBar || mobileMenu.classList.contains('hidden')) return;
        if (!mobileMenu.contains(event.target) && !navBar.contains(event.target)) {
            closeMobileMenu();
        }
    });

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', (event) => {
            if (event.target.id === 'cart-overlay') {
                toggleCart();
            }
        });
    }

    const checkoutOverlay = document.getElementById('checkout-overlay');
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener('click', (event) => {
            if (event.target.id === 'checkout-overlay') {
                closeCheckoutModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }

        if (checkoutOverlay && !checkoutOverlay.classList.contains('hidden')) {
            closeCheckoutModal();
        }
    });
});
