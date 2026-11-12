import {escapeHtml as e,todayMoscow,isVisible,filterOffers,validateRequest,composeRequest,offerVariants,matchingVariants,offerSummary} from './domain.mjs';
const config=window.TRAVEL_CONFIG;
let catalog=window.TRAVEL_CATALOG;
const $=id=>document.getElementById(id);
const money=o=>o.amount?`${o.priceKind==='from'?'от ':''}${new Intl.NumberFormat('ru-RU').format(o.amount)} ₽`:'По запросу';
const basis=o=>({person:'за человека',twoAdults:'за 2 взрослых',request:'Стоимость рассчитывается индивидуально'}[o.priceBasis]||'Уточните расчёт');
const media=o=>o.image&&/^assets\/[a-zA-Z0-9._-]+$/.test(o.image)?`<div class="tour-img"><img src="${e(o.image)}" alt="${e(o.imageAlt||o.name)}" loading="lazy" width="600" height="350"><span class="image-label">${e(o.country)}</span><span class="offer-badge">${o.status==='confirmed'?'Даты подтверждены':'Подбор по запросу'}</span></div>`:`<div class="tour-img"><div class="art-image" aria-hidden="true"><span>${e(o.country.toUpperCase())}</span></div><span class="offer-badge">Подбор по запросу</span></div>`;
const validPhoto=src=>typeof src==='string'&&/^assets\/[a-zA-Z0-9._-]+$/.test(src);
const galleryPhotos=o=>[{src:o.image,alt:o.imageAlt||o.name,caption:o.imageCaption||'',source:o.imageSource},...(Array.isArray(o.gallery)?o.gallery:[])].filter(p=>validPhoto(p.src));
let galleryOffer=null,galleryIndex=0;
function galleryMarkup(o){
 const photos=galleryPhotos(o);if(!photos.length)return '';
 if(galleryOffer?.id!==o.id)galleryIndex=0;galleryOffer=o;galleryIndex=Math.min(galleryIndex,photos.length-1);const p=photos[galleryIndex];
 return `<section class="trip-gallery" aria-label="Фотографии: ${e(o.name)}"><div class="gallery-stage"><img id="gallery-main" src="${e(p.src)}" alt="${e(p.alt)}" width="1100" height="750" decoding="async">${photos.length>1?'<button class="gallery-arrow gallery-prev" type="button" data-gallery-step="-1" aria-label="Предыдущее фото">‹</button><button class="gallery-arrow gallery-next" type="button" data-gallery-step="1" aria-label="Следующее фото">›</button>':''}<span id="gallery-count" class="gallery-count" aria-live="polite">${galleryIndex+1} / ${photos.length}</span></div><p class="gallery-caption" id="gallery-caption">${e(p.caption)}</p><div class="gallery-thumbs" aria-label="Выбор фотографии">${photos.map((photo,i)=>`<button class="gallery-thumb" type="button" data-gallery-index="${i}" aria-label="Фото ${i+1} из ${photos.length}" aria-pressed="${i===galleryIndex}"><img src="${e(photo.src)}" alt="" loading="lazy" width="120" height="84"></button>`).join('')}</div></section>`;
}
function switchGallery(index){
 if(!galleryOffer)return;const photos=galleryPhotos(galleryOffer);galleryIndex=(index+photos.length)%photos.length;const photo=photos[galleryIndex];$('gallery-main').src=photo.src;$('gallery-main').alt=photo.alt;$('gallery-caption').textContent=photo.caption;$('gallery-count').textContent=(galleryIndex+1)+' / '+photos.length;
 dialog.querySelectorAll('[data-gallery-index]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.galleryIndex)===galleryIndex)));
}
let currentCountry='';
const grid=$('tours-grid'),dialog=$('trip-dialog'),form=$('trip-request');
let selectedOffer=null,lastOpener=null;
let onlineForm=false,submitting=false,requestKey=crypto.randomUUID();
function render(){
 const f=currentCountry?{country:currentCountry}:{};const items=filterOffers(catalog.offers,f);
 $('result-count').textContent=(currentCountry?currentCountry+' · ':'')+`Показано предложений: ${items.length}`;
 $('catalog-all').hidden=!currentCountry;$('empty-state').hidden=items.length>0;
 grid.innerHTML=items.map(item=>{const o=offerSummary(item,f);return `<article class="tour-card">${media(o)}<div class="tour-body"><p class="tour-tag">${e(o.country)}${o.region?' · '+e(o.region):''}</p><h3 class="tour-name">${e(o.name)}</h3><ul class="trip-facts"><li>${e(o.period)}</li><li>${e(o.duration)}</li><li>${e(o.room)}</li></ul><p class="tour-desc">${e(o.summary)}</p>${o.variantCount>1?`<p class="variant-count">${o.variantCount} варианта · даты и цены внутри</p>`:''}<p class="tour-source">Публикация ${e(o.publishedAt)} · ${o.priceCheckedAt?'Проверено '+e(o.priceCheckedAt):'Наличие и цена уточняются'}</p><div class="tour-footer"><div><span class="tour-price-from">${o.amount?'Ориентир из публикации':'Индивидуальный расчёт'}</span><span class="tour-price-amt">${e(money(o))}</span><span class="tour-price-sub">${e(basis(o))}</span></div><button class="tour-btn" data-offer="${e(o.id)}" aria-label="Подробнее: ${e(o.name)}, ${e(o.period)}, ${e(o.room)}">Подробнее ↗</button></div></div></article>`;}).join('');
}
function closeTrip(){dialog.close();document.body.classList.remove('dialog-open');lastOpener?.focus();}
function openTrip(id,opener,variantId){
 const group=catalog.offers.find(t=>t.id===id);if(!group)return;if(opener)lastOpener=opener;
 const variants=offerVariants(group).filter(v=>isVisible({...group,...v}));
 const filtered=matchingVariants(group);
 const chosen=variants.find(v=>v.id===variantId)||filtered[0]||variants[0];if(!chosen)return;
 const o={...group,...chosen,name:group.name,image:group.image};
 const variantPicker=variants.length>1?`<fieldset class="variant-picker"><legend>Выберите вариант поездки</legend><p class="variant-hint">Цена и условия ниже относятся к выбранному варианту.</p><div class="variant-options">${variants.map(v=>`<label class="variant-option"><input type="radio" name="trip-variant" data-group="${e(group.id)}" value="${e(v.id)}" ${v.id===chosen.id?'checked':''}><span><strong>${e(v.period)}</strong><small>${e(v.duration)} · ${e(v.room)}</small><b>${e(money(v))}</b><small>${e(basis(v))}</small></span></label>`).join('')}</div></fieldset>`:'<p class="single-variant-note">Другие даты и категории — по индивидуальному расчёту.</p>';

 const rows=[['Период',o.period],['Точная дата выезда',o.departureDate||'Подтверждается менеджером'],['Продолжительность',o.duration],['Размещение',o.room],['Питание',o.meal],['Город вылета',o.departureCity||'Уточняется'],['Туроператор',o.operator||'Сведения предоставляются до заключения договора'],['Дата публикации',o.publishedAt],['Дата проверки цены',o.priceCheckedAt||'Текущая цена не подтверждена']];
 $('trip-detail').innerHTML=`<div class="trip-detail-head"><p class="sec-label">${e(o.country)} · ${e(o.kind)}</p><h2 id="trip-title">${e(o.name)}</h2></div>${galleryMarkup(group)}<div class="trip-detail-body">${variantPicker}<p class="trip-description">${e(o.summary)}</p><table class="detail-table"><tbody>${rows.map(([k,v])=>`<tr><th scope="row">${e(k)}</th><td>${e(v)}</td></tr>`).join('')}</tbody></table><div class="trip-price"><p>${o.amount?'Цена из публикации, наличие уточняется':'Стоимость по запросу'}</p><strong>${e(money(o))}</strong><p>${e(basis(o))}</p></div><div class="conditions-grid"><div class="condition-box"><h3>В публикации включено</h3><ul>${(o.included.length?o.included:['Полный состав услуг нужно подтвердить']).map(v=>`<li>${e(v)}</li>`).join('')}</ul></div><div class="condition-box"><h3>Отдельно или по уточнению</h3><ul>${(o.excluded.length?o.excluded:['Неуказанные услуги не считаются включёнными']).map(v=>`<li>${e(v)}</li>`).join('')}</ul></div></div><div class="condition-box"><h3>Что уточнить перед бронированием</h3><ul>${o.missing.map(v=>`<li>${e(v)}</li>`).join('')}</ul></div>${group.archiveText?`<details class="archive-publication"><summary>Материал из Telegram · ${e(o.publishedAt)}</summary><p class="fine-print">Архивная публикация. Указанные в ней цены, даты и акции не подтверждают текущие условия.</p><p class="trip-description">${e(group.archiveText)}</p></details>`:''}${o.imageCaption?`<p class="fine-print">${e(o.imageCaption)}</p>`:''}<p class="fine-print">Цена не фиксирует бронирование. Состав услуг, доплаты и условия оплаты согласуются в договоре.</p><button class="btn-hero btn-fill" id="request-offer">Уточнить это предложение</button><p class="fine-print"><a href="${e(o.sourceUrl)}" target="_blank" rel="noopener noreferrer">Открыть канал-источник</a> · <a href="booking.html">Порядок бронирования</a></p></div>`;
 $('request-offer').onclick=()=>{requestKey=crypto.randomUUID();selectedOffer={...o,id:group.id,variantId:chosen.id,variantLabel:chosen.period+' · '+chosen.duration+' · '+chosen.room,variantPrice:money(chosen)+' · '+basis(chosen)};form.elements.adults.value=String(o.adults||2);form.elements.children.value=String(o.children||0);form.elements.destination.value=`${o.name} · ${o.period} · ${o.room}`;form.elements.manager.value=o.manager;closeTrip();$('request').scrollIntoView({behavior:'smooth'});form.elements.name.focus({preventScroll:true});};
 document.body.classList.add('dialog-open');if(!dialog.open){dialog.showModal();dialog.scrollTop=0;$('trip-close').focus();}
}
dialog.addEventListener('click',event=>{const thumb=event.target.closest('[data-gallery-index]');if(thumb)switchGallery(Number(thumb.dataset.galleryIndex));const arrow=event.target.closest('[data-gallery-step]');if(arrow)switchGallery(galleryIndex+Number(arrow.dataset.galleryStep));});
dialog.addEventListener('keydown',event=>{if(!event.target.closest('.trip-gallery'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();switchGallery(galleryIndex+(event.key==='ArrowRight'?1:-1));}});
dialog.addEventListener('change',event=>{const radio=event.target.closest('[name="trip-variant"]');if(radio){const value=radio.value;openTrip(radio.dataset.group,null,value);dialog.querySelectorAll('[name="trip-variant"]').forEach(input=>{if(input.value===value)input.focus({preventScroll:true});});}});
grid.addEventListener('click',event=>{const b=event.target.closest('[data-offer]');if(b)openTrip(b.dataset.offer,b);});
$('trip-close').onclick=closeTrip;
dialog.addEventListener('cancel',()=>{document.body.classList.remove('dialog-open');});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeTrip();}});
function showAllOffers(){currentCountry='';render();}
$('empty-reset').onclick=showAllOffers;$('catalog-all').onclick=showAllOffers;
document.querySelectorAll('[data-country]').forEach(a=>a.addEventListener('click',()=>{currentCountry=a.dataset.country;render();}));
document.querySelectorAll('a[href="#tours"]:not([data-country])').forEach(a=>a.addEventListener('click',showAllOffers));
$('menu-toggle').onclick=()=>{const open=$('menu-toggle').getAttribute('aria-expanded')!=='true';$('menu-toggle').setAttribute('aria-expanded',open);$('site-menu').classList.toggle('open',open);};
document.querySelectorAll('#site-menu a').forEach(a=>a.addEventListener('click',()=>{$('menu-toggle').setAttribute('aria-expanded','false');$('site-menu').classList.remove('open');}));
function dataFromForm(){const d=Object.fromEntries(new FormData(form));return {...d,requestKey,flexible:form.elements.flexible.checked,consent:form.elements.consent.checked,consentVersion:config.privacyVersion,offerId:selectedOffer?.id||'',offerName:selectedOffer?.name||'',variantId:selectedOffer?.variantId||'',variantLabel:selectedOffer?.variantLabel||'',variantPrice:selectedOffer?.variantPrice||''};}
function updateContactType(){const input=form.elements.contact,method=form.elements.method.value;input.type=method==='email'?'email':method==='phone'?'tel':'text';input.placeholder=method==='email'?'name@example.ru':method==='phone'?'+7 900 000-00-00':'@username';input.autocomplete=method==='email'?'email':method==='phone'?'tel':'off';}
form.elements.method.addEventListener('change',updateContactType);
form.addEventListener('input',event=>{if(event.target.name==='destination')selectedOffer=null;requestKey=crypto.randomUUID();$('request-result').hidden=true;$('request-status').textContent='';});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(submitting)return;const d=dataFromForm();const err=validateRequest(d,todayMoscow(),onlineForm);
 if(err){$('request-status').textContent=err;return;}
 if(!onlineForm){const text=composeRequest(d);$('request-text').value=text;const manager=d.manager==='julia'?config.julia:config.maria;$('send-telegram').href=`https://t.me/${manager}?text=${encodeURIComponent(text)}`;$('request-result').hidden=false;$('request-status').textContent='Текст подготовлен. Он ещё не отправлен менеджеру.';$('request-result').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 submitting=true;$('request-submit').disabled=true;$('request-status').textContent='Отправляем запрос…';
 try{const response=await fetch(config.formEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.message||'Не удалось подтвердить отправку.');$('request-status').textContent=`Запрос ${result.id} передан в Telegram менеджера. ${config.responseTime}.`;}
 catch(error){$('request-status').textContent='Не удалось подтвердить доставку. Свяжитесь с менеджером через раздел «Контакты». Введённые данные сохранены на странице.';}
 finally{submitting=false;$('request-submit').disabled=false;}
});
$('copy-request').onclick=async()=>{try{await navigator.clipboard.writeText($('request-text').value);$('request-status').textContent='Текст скопирован. Отправьте его менеджеру самостоятельно.';}catch{$('request-text').focus();$('request-text').select();$('request-status').textContent='Выделен текст — скопируйте его вручную.';}};
const observer=new IntersectionObserver(entries=>{document.body.classList.toggle('form-visible',entries.some(v=>v.isIntersecting));},{threshold:.05});observer.observe($('request'));
const access=$('access-panel');let accessOpener=$('access-toggle');
const accessButtons=[$('access-toggle'),$('access-top')].filter(Boolean);
function closeAccess(){access.hidden=true;accessButtons.forEach(b=>b.setAttribute('aria-expanded','false'));accessOpener.focus();}
for(const button of accessButtons)button.onclick=()=>{accessOpener=button;access.hidden=!access.hidden;accessButtons.forEach(b=>b.setAttribute('aria-expanded',String(!access.hidden)));if(!access.hidden)$('access-size').focus();};
$('access-close').onclick=closeAccess;
function accessibility(){document.body.dataset.font=$('access-size').value;document.body.classList.remove('vi-white','vi-black');const v=$('access-contrast').value;if(v!=='normal')document.body.classList.add('vi-'+v);document.body.classList.toggle('vi-noimg',$('access-images').checked);try{localStorage.setItem('ta-accessibility-v2',JSON.stringify({size:$('access-size').value,contrast:v,images:$('access-images').checked}));}catch{}}
for(const id of ['access-size','access-contrast','access-images'])$(id).addEventListener('change',accessibility);
try{const saved=JSON.parse(localStorage.getItem('ta-accessibility-v2'));if(saved){if(['normal','large','xlarge'].includes(saved.size))$('access-size').value=saved.size;if(['normal','white','black'].includes(saved.contrast))$('access-contrast').value=saved.contrast;$('access-images').checked=!!saved.images;accessibility();}}catch{}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!access.hidden)closeAccess();});
render();
// Static catalog remains usable when PHP is absent. Do not log client data.
fetch('catalog.json',{cache:'no-store',signal:AbortSignal.timeout(5000)}).then(r=>r.ok?r.json():null).then(d=>{if(d&&Array.isArray(d.offers)){catalog=d;render();}}).catch(()=>{});
