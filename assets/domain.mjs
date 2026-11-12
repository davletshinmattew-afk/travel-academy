export function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function todayMoscow(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function isVisible(offer,today=todayMoscow()){
 return ['request','confirmed'].includes(offer.status)&&(!offer.expiresAt||offer.expiresAt>=today)&&(!offer.departureDate||offer.departureDate>=today);
}
export function offerVariants(offer){return Array.isArray(offer.variants)&&offer.variants.length?offer.variants:[offer];}
export function matchingVariants(offer,filters={},today=todayMoscow()){
 return offerVariants(offer).filter(v=>isVisible({...offer,...v},today)&&(!filters.month||v.flexibleDates||v.month===Number(filters.month))&&(!filters.budget||(v.currency==='RUB'&&v.priceBasis===filters.basis&&Number.isFinite(v.amount)&&v.amount>0&&v.amount<=Number(filters.budget))));
}
export function filterOffers(offers,filters={},today=todayMoscow()){
 return offers.filter(o=>isVisible(o,today)&&(!filters.country||o.country===filters.country)&&(!filters.kind||o.kind===filters.kind)&&matchingVariants(o,filters,today).length>0);
}
export function offerSummary(offer,filters={},today=todayMoscow()){
 const variants=matchingVariants(offer,filters,today),priced=variants.filter(v=>Number.isFinite(v.amount)&&v.amount>0);
 const bases=new Set(priced.map(v=>v.priceBasis));
 const cheapest=bases.size===1?priced.reduce((best,v)=>!best||v.amount<best.amount?v:best,null):null;
 return {...offer,amount:cheapest?.amount||null,priceBasis:cheapest?.priceBasis||'request',priceKind:cheapest?(variants.length>1||cheapest.priceKind==='from'?'from':cheapest.priceKind):'request',period:variants.length>1?'Несколько дат на выбор':variants[0]?.period||offer.period,duration:new Set(variants.map(v=>v.duration)).size>1?'Длительность по варианту':variants[0]?.duration||offer.duration,room:new Set(variants.map(v=>v.room)).size>1?'Категория по варианту':variants[0]?.room||offer.room,summary:variants.length===1?variants[0].summary||offer.summary:offer.summary,publishedAt:cheapest?.publishedAt||offer.publishedAt,variantCount:variants.length};
}
export function validateRequest(data,today=todayMoscow(),delivery=false){
 if(data.website)return 'Не удалось отправить запрос.';
 const adults=Number(data.adults),children=Number(data.children||0);
 if(!Number.isInteger(adults)||adults<1||adults>20)return 'Укажите число взрослых от 1 до 20.';
 if(!Number.isInteger(children)||children<0||children>10)return 'Укажите число детей от 0 до 10.';
 if(children>0&&!String(data.childAges||'').trim())return 'Укажите возраст детей на момент поездки.';
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 for(const d of [data.dateFrom,data.dateTo].filter(Boolean)){if(!validDate(d))return 'Проверьте даты поездки.';if(d<today)return 'Дата поездки не может быть в прошлом.';}
 if(data.dateFrom&&data.dateTo&&data.dateTo<data.dateFrom)return 'Дата окончания должна быть не раньше даты начала.';
 if(data.budget&&(!Number.isFinite(Number(data.budget))||Number(data.budget)<0))return 'Проверьте бюджет.';
 const contact=String(data.contact||'').trim();
 if(delivery&&(!data.name?.trim()||!contact))return 'Для ответа укажите имя и контакт.';
 if(contact&&data.method==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))return 'Проверьте адрес электронной почты.';
 if(contact&&data.method==='phone'&&!/^\+?[\d()\s-]{7,25}$/.test(contact))return 'Проверьте номер телефона.';
 if(contact&&data.method==='telegram'&&!/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(contact))return 'Укажите имя Telegram, например @username, или выберите другой способ связи.';
 if(delivery&&!data.consent)return 'Для отправки необходимо согласие на обработку данных.';
 return '';
}
export function composeRequest(d){
 const method={telegram:'Telegram',phone:'Телефон',email:'Email'}[d.method]||'Контакт';
 return ['Здравствуйте! Хочу подобрать путешествие.',d.offerName&&`Предложение: ${d.offerName}`,d.offerId&&`Код предложения: ${d.offerId}`,d.variantLabel&&`Вариант: ${d.variantLabel}`,d.variantPrice&&`Ориентир цены: ${d.variantPrice}`,d.variantId&&`Код варианта: ${d.variantId}`,d.name&&`Имя: ${d.name}`,d.contact&&`${method}: ${d.contact}`,d.destination&&`Направление: ${d.destination}`,d.dateFrom&&`Начало: ${d.dateFrom}`,d.dateTo&&`Окончание: ${d.dateTo}`,d.flexible&&'Даты можно сдвинуть.',`Состав: ${d.adults} взр., ${d.children||0} дет.`,d.childAges&&`Возраст детей: ${d.childAges}`,d.budget&&`Бюджет: ${new Intl.NumberFormat('ru-RU').format(Number(d.budget))} ₽ ${d.budgetBasis==='person'?'на человека':'на поездку'}`,d.wishes&&`Пожелания: ${d.wishes}`].filter(Boolean).join('\n');
}
