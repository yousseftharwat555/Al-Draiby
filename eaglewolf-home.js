// تفعيل التبويب الصحيح بناءً على الصفحة الحالية
(function(){
const path = location.pathname.split('/').pop().toLowerCase();
const map = {
'': 'home',
'index.html': 'home',
'home.html': 'home',
'books.html': 'books',
'profile.html': 'profile'
};
const current = map[path] || document.body.dataset.page; // fallback لو حبّينا نستخدم data-page
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => {
const target = t.dataset.target;
t.setAttribute('aria-current', target===current ? 'page' : 'false');
});
})();


// (اختياري) منع الرجوع لأعلى الصفحة عند الضغط على نفس الرابط
document.querySelectorAll('.tab').forEach(a=>{
a.addEventListener('click', (e)=>{
const href = a.getAttribute('href');
if(href && href.replace('#','') === location.hash.replace('#','')){
e.preventDefault();
}
});
});