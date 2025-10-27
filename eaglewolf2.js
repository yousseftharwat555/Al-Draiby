// أكورديون: يدعم أكتر من قسم
document.querySelectorAll('.accordion-toggle').forEach(btn=>{
  const id = btn.getAttribute('data-target');
  const panel = document.getElementById(id);
  if(!panel) return;

  btn.addEventListener('click', ()=>{
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
});
