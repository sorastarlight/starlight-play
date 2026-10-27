const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(require.resolve('../js/store.js'),'utf8');
function extract(name){const start=src.indexOf('  function '+name+'('),end=src.indexOf('\n  function ',start+2);assert(start>=0);return src.slice(start,end);}
const notices=[],items={a:{sku:'a',name:'Honey',cost:125},b:{sku:'b',name:'Ball',cost:100},look:{sku:'look',name:'Look',cost:50,pack:'look'},bits:{sku:'bits',bits:1,cost:0}};
const ctx={cart:[],checkoutBusy:false,lastWallet:{coins:225},lastOwned:[],CART_MAX_QTY:99,checkoutNote:'',lastPurchase:null,findSku:k=>items[k],displayName:i=>i.name,saveCart(){},syncCheckoutUi(){},window:{playToast:n=>notices.push(n)}};
vm.createContext(ctx);vm.runInContext(['cartFeedback','emptyCart','setCartQty','addToCheckout'].map(extract).join('\n'),ctx);
ctx.addToCheckout('a');assert.equal(ctx.cart[0].qty,1);assert.equal(notices.at(-1).kind,'success');
ctx.addToCheckout('b');assert.equal(ctx.cart.length,2);ctx.addToCheckout('b');assert.equal(ctx.cart[1].qty,1);assert.equal(notices.at(-1).kind,'error');
ctx.setCartQty('a',0);assert.equal(ctx.cart.length,1);ctx.setCartQty('b',2);assert.equal(ctx.cart[0].qty,2);
ctx.setCartQty('b',999);assert.equal(ctx.cart[0].qty,2);ctx.setCartQty('b',1.5);assert.equal(ctx.cart[0].qty,2);
ctx.checkoutBusy=true;ctx.emptyCart();assert.equal(ctx.cart.length,1);ctx.setCartQty('b',0);assert.equal(ctx.cart.length,1);ctx.checkoutBusy=false;ctx.emptyCart();assert.equal(ctx.cart.length,0);
ctx.lastWallet=null;ctx.addToCheckout('a');assert.equal(ctx.cart.length,0);assert.equal(notices.at(-1).kind,'error');
ctx.lastWallet={coins:225};ctx.addToCheckout('bits');assert.equal(ctx.cart.length,0);ctx.lastOwned=['look'];ctx.addToCheckout('look');assert.equal(ctx.cart.length,0);
ctx.lastOwned=[];ctx.setCartQty('look',5);assert.equal(ctx.cart[0].qty,1);ctx.lastWallet={coins:0};ctx.setCartQty('look',0);assert.equal(ctx.cart.length,0);
assert(!extract('addButton').includes('Not in cart'));assert(extract('checkoutHtml').includes('data-cart-empty'));
console.log('PASS cart budget: aggregate affordability, exact balance, quantity input, remove/empty, loading, owned looks, Bits and purchase lock');
