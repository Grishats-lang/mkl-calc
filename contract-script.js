// ==============================================
// СКРИПТ ДЛЯ ГЕНЕРАЦИИ ДОГОВОРОВ МК-Л
// ==============================================

// Конфигурация
const CONFIG = {
    dadataApiKey: 'dc91c2bd189b5668cd7faedec70a4b4bccd30a82', // Замените на ваш ключ
    dadataApiUrl: 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
    pricePerSqm: 12000, // Цена за м² (базовая)
    contractorData: {
        fullName: 'ООО «МК-Л»',
        inn: '3528245340',
        kpp: '352801001',
        ogrn: '1163525055671',
        legalAddress: '162602, Вологодская область, г. Череповец, Советский пр-кт, д. 8а, офис 4 ',
        director: 'Генеральный директор',
        phone: '+7 (8202) 67-69-97',
        email: 'info@mk-l.ru'
    }
};

// Текущий шаг
let currentStep = 1;
let formData = {};

// ==============================================
// ИНИЦИАЛИЗАЦИЯ
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    // Загрузка данных из калькулятора (если есть)
    loadCalculatorData();
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Инициализация маски телефона
    setupPhoneMask();
    
    // Обновление предпросмотра
    updateCostPreview();
});

// ==============================================
// ЗАГРУЗКА ДАННЫХ ИЗ КАЛЬКУЛЯТОРА
// ==============================================
function loadCalculatorData() {
    const savedData = sessionStorage.getItem('calculatorData');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            // Заполняем поля из калькулятора
            if (data.length) document.getElementById('length').value = data.length;
            if (data.width) document.getElementById('width').value = data.width;
            if (data.height) document.getElementById('height').value = data.height;
            if (data.executionType) document.getElementById('executionType').value = data.executionType;
            if (data.wallThickness) document.getElementById('wallThickness').value = data.wallThickness;
            if (data.roofThickness) document.getElementById('roofThickness').value = data.roofThickness;
            if (data.windowsCount) document.getElementById('windowsCount').value = data.windowsCount;
            if (data.gatesCount) document.getElementById('gatesCount').value = data.gatesCount;
            
            updateCostPreview();
            
            // Показываем уведомление
            showNotification('Данные из калькулятора загружены', 'success');
        } catch (e) {
            console.error('Ошибка загрузки данных калькулятора:', e);
        }
    }
}

// ==============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ==============================================
function setupEventListeners() {
    // Кнопки навигации
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);
    document.getElementById('generateBtn').addEventListener('click', generateDocuments);
    
    // Проверка ИНН
    document.getElementById('checkInnBtn').addEventListener('click', checkINN);
    document.getElementById('inn').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    // Разрешение ручного редактирования
    document.getElementById('enableEditBtn').addEventListener('click', enableManualEdit);
    
    // Обновление расчетов при изменении параметров
    const calcFields = ['length', 'width', 'height', 'executionType', 'wallThickness', 
                        'roofThickness', 'windowsCount', 'gatesCount'];
    calcFields.forEach(field => {
        const elem = document.getElementById(field);
        if (elem) {
            elem.addEventListener('change', updateCostPreview);
            elem.addEventListener('input', updateCostPreview);
        }
    });
}

// ==============================================
// МАСКА ТЕЛЕФОНА
// ==============================================
function setupPhoneMask() {
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value[0] === '8') value = '7' + value.slice(1);
            if (value[0] !== '7') value = '7' + value;
        }
        
        let formatted = '+7';
        if (value.length > 1) {
            formatted += ' (' + value.substring(1, 4);
        }
        if (value.length >= 5) {
            formatted += ') ' + value.substring(4, 7);
        }
        if (value.length >= 8) {
            formatted += '-' + value.substring(7, 9);
        }
        if (value.length >= 10) {
            formatted += '-' + value.substring(9, 11);
        }
        
        e.target.value = formatted;
    });
}

// ==============================================
// ПЕРЕХОД МЕЖДУ ШАГАМИ
// ==============================================
function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }
    
    saveStepData();
    
    if (currentStep < 4) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(step) {
    // Скрываем все шаги
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.progress-step').forEach(s => {
        s.classList.remove('active');
        if (parseInt(s.dataset.step) < step) {
            s.classList.add('completed');
        } else {
            s.classList.remove('completed');
        }
    });
    
    // Показываем текущий шаг
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${step}"]`).classList.add('active');
    
    // Управление кнопками
    document.getElementById('prevBtn').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('nextBtn').style.display = step < 4 ? 'block' : 'none';
    document.getElementById('generateBtn').style.display = step === 4 ? 'block' : 'none';
    
    // Заполняем предпросмотр на последнем шаге
    if (step === 4) {
        fillPreview();
    }
    
    // Прокрутка наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==============================================
// ВАЛИДАЦИЯ ШАГОВ
// ==============================================
function validateCurrentStep() {
    const step = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredFields = step.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--error-color)';
            isValid = false;
        } else {
            field.style.borderColor = 'var(--border-color)';
        }
    });
    
    if (!isValid) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
    }
    
    // Дополнительная валидация для шага 2 (ИНН)
    if (currentStep === 2) {
        const innField = document.getElementById('inn');
        const fullNameField = document.getElementById('fullName');
        
        if (!validateINN(innField.value)) {
            showNotification('Введите корректный ИНН (10 или 12 цифр)', 'error');
            innField.style.borderColor = 'var(--error-color)';
            return false;
        }
        
        if (!fullNameField.value.trim()) {
            showNotification('Пожалуйста, проверьте ИНН и загрузите данные компании', 'error');
            return false;
        }
    }
    
    // Валидация для шага 4 (согласие)
    if (currentStep === 4) {
        const agreementCheckbox = document.getElementById('agreement');
        if (!agreementCheckbox.checked) {
            showNotification('Необходимо подтвердить согласие с условиями', 'error');
            return false;
        }
    }
    
    return isValid;
}

// ==============================================
// ПРОВЕРКА ИНН ЧЕРЕЗ DADATA API
// ==============================================
async function checkINN() {
    const innInput = document.getElementById('inn');
    const inn = innInput.value.trim();
    const statusDiv = document.getElementById('innStatus');
    const checkBtn = document.getElementById('checkInnBtn');
    
    // Валидация ИНН
    if (!validateINN(inn)) {
        statusDiv.className = 'field-status error';
        statusDiv.textContent = 'Введите корректный ИНН (10 или 12 цифр)';
        return;
    }
    
    // Начало проверки
    statusDiv.className = 'field-status loading';
    statusDiv.textContent = 'Поиск данных компании...';
    checkBtn.disabled = true;
    checkBtn.textContent = 'Проверка...';
    
    try {
        // ДЕМО РЕЖИМ: Используем тестовые данные
        // В продакшене раскомментируйте реальный API запрос
        const companyData = await fetchCompanyDataDemo(inn);
        
        // Реальный API запрос (раскомментируйте для продакшена)
        // const companyData = await fetchCompanyDataReal(inn);
        
        if (companyData) {
            // Заполняем поля
            document.getElementById('fullName').value = companyData.fullName;
            document.getElementById('kpp').value = companyData.kpp;
            document.getElementById('ogrn').value = companyData.ogrn;
            document.getElementById('legalAddress').value = companyData.legalAddress;
            document.getElementById('director').value = companyData.director;
            
            // Подсвечиваем автозаполненные поля
            document.querySelectorAll('#fullName, #kpp, #ogrn, #legalAddress, #director').forEach(field => {
                field.classList.add('auto-filled');
            });
            
            // Показываем сообщение об успехе
            document.getElementById('autoFillSection').style.display = 'block';
            document.getElementById('enableEditBtn').style.display = 'block';
            
            statusDiv.className = 'field-status success';
            statusDiv.textContent = 'Данные компании найдены и загружены';
            
            showNotification('Данные компании успешно загружены', 'success');
        } else {
            throw new Error('Компания не найдена');
        }
    } catch (error) {
        statusDiv.className = 'field-status error';
        statusDiv.textContent = 'Не удалось найти компанию. Проверьте ИНН или заполните данные вручную.';
        
        showNotification('Ошибка при проверке ИНН', 'error');
        
        // Разрешаем ручное редактирование
        document.getElementById('enableEditBtn').style.display = 'block';
    } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = 'Проверить ИНН';
    }
}

// ==============================================
// ПОЛУЧЕНИЕ ДАННЫХ КОМПАНИИ (ДЕМО)
// ==============================================
async function fetchCompanyDataDemo(inn) {
    // Имитация задержки API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Тестовые данные для демонстрации
    const demoCompanies = {
        '7707083893': {
            fullName: 'ООО "АЛЬФА СТРОЙ"',
            kpp: '770701001',
            ogrn: '1027700132195',
            legalAddress: 'г. Москва, ул. Тверская, д. 1',
            director: 'Иванов Иван Иванович'
        },
        '7728168971': {
            fullName: 'ООО "МЕГА СТРОЙ"',
            kpp: '772801001',
            ogrn: '1027739169268',
            legalAddress: 'г. Москва, ул. Арбат, д. 10',
            director: 'Петров Петр Петрович'
        }
    };
    
    // Если ИНН из демо списка - возвращаем демо данные
    if (demoCompanies[inn]) {
        return demoCompanies[inn];
    }
    
    // Иначе генерируем случайные данные
    return {
        fullName: `ООО "ДЕМО КОМПАНИЯ ${inn.slice(-4)}"`,
        kpp: inn.slice(0, 4) + '01001',
        ogrn: '10277' + inn.slice(0, 8),
        legalAddress: 'г. Москва, ул. Тестовая, д. ' + Math.floor(Math.random() * 100),
        director: 'Демонстрационный Демо Демович'
    };
}

// ==============================================
// РЕАЛЬНЫЙ API ЗАПРОС К DADATA (для продакшена)
// ==============================================
async function fetchCompanyDataReal(inn) {
    const response = await fetch(CONFIG.dadataApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${CONFIG.dadataApiKey}`
        },
        body: JSON.stringify({
            query: inn,
            type: 'LEGAL',
            count: 1
        })
    });
    
    if (!response.ok) {
        throw new Error('API request failed');
    }
    
    const data = await response.json();
    
    if (data.suggestions && data.suggestions.length > 0) {
        const company = data.suggestions[0].data;
        return {
            fullName: company.name.full_with_opf,
            kpp: company.kpp,
            ogrn: company.ogrn,
            legalAddress: company.address.value,
            director: company.management ? company.management.name : 'Не указано'
        };
    }
    
    return null;
}

// ==============================================
// ВАЛИДАЦИЯ ИНН
// ==============================================
function validateINN(inn) {
    inn = inn.replace(/\D/g, '');
    
    if (inn.length !== 10 && inn.length !== 12) {
        return false;
    }
    
    // Упрощенная валидация контрольной суммы для 10-значного ИНН
    if (inn.length === 10) {
        const weights = [2, 4, 10, 3, 5, 9, 4, 6, 8];
        const sum = weights.reduce((acc, weight, i) => acc + (parseInt(inn[i]) * weight), 0);
        const checkDigit = sum % 11 % 10;
        return checkDigit === parseInt(inn[9]);
    }
    
    return true; // Для 12-значного упрощаем
}

// ==============================================
// РАЗРЕШЕНИЕ РУЧНОГО РЕДАКТИРОВАНИЯ
// ==============================================
function enableManualEdit() {
    const fields = ['fullName', 'kpp', 'ogrn', 'legalAddress', 'director'];
    fields.forEach(field => {
        const elem = document.getElementById(field);
        elem.removeAttribute('readonly');
        elem.style.backgroundColor = 'var(--background-white)';
    });
    
    showNotification('Теперь вы можете редактировать реквизиты вручную', 'info');
    document.getElementById('enableEditBtn').style.display = 'none';
}

// ==============================================
// СОХРАНЕНИЕ ДАННЫХ ШАГА
// ==============================================
function saveStepData() {
    const currentStepElem = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const inputs = currentStepElem.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else {
            formData[input.name] = input.value;
        }
    });
}

// ==============================================
// ОБНОВЛЕНИЕ ПРЕДПРОСМОТРА СТОИМОСТИ
// ==============================================
function updateCostPreview() {
    const length = parseFloat(document.getElementById('length').value) || 0;
    const width = parseFloat(document.getElementById('width').value) || 0;
    const height = parseFloat(document.getElementById('height').value) || 0;
    const executionType = document.getElementById('executionType').value;
    
    const area = length * width;
    let pricePerSqm = CONFIG.pricePerSqm;
    
    // Корректировка цены в зависимости от типа
    if (executionType === 'теплое') {
        pricePerSqm *= 1.3;
    }
    
    const totalCost = Math.round(area * pricePerSqm);
    
    document.getElementById('previewArea').textContent = area.toFixed(2) + ' м²';
    document.getElementById('previewCost').textContent = formatNumber(totalCost) + ' руб.';
    
    // Сохраняем в formData
    formData.area = area;
    formData.totalCost = totalCost;
}

// ==============================================
// ЗАПОЛНЕНИЕ ФИНАЛЬНОГО ПРЕДПРОСМОТРА
// ==============================================
function fillPreview() {
    // Параметры проекта
    document.getElementById('finalLength').textContent = formData.length || '-';
    document.getElementById('finalWidth').textContent = formData.width || '-';
    document.getElementById('finalHeight').textContent = formData.height || '-';
    document.getElementById('finalArea').textContent = (formData.area || 0).toFixed(2);
    document.getElementById('finalType').textContent = formData.executionType || '-';
    document.getElementById('finalCost').textContent = formatNumber(formData.totalCost || 0);
    
    // Реквизиты
    document.getElementById('finalCompany').textContent = formData.fullName || '-';
    document.getElementById('finalInn').textContent = formData.inn || '-';
    document.getElementById('finalKpp').textContent = formData.kpp || '-';
    
    // Контакты
    document.getElementById('finalContact').textContent = formData.contactName || '-';
    document.getElementById('finalPhone').textContent = formData.phone || '-';
    document.getElementById('finalEmail').textContent = formData.email || '-';
}

// ==============================================
// ГЕНЕРАЦИЯ ДОКУМЕНТОВ
// ==============================================
async function generateDocuments() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Генерация документов...';
    
    // Сохраняем данные последнего шага
    saveStepData();
    
    // Показываем индикатор загрузки
    showLoading();
    
    try {
        // Подготовка данных для генерации
        const contractData = prepareContractData();
        
        // Имитация генерации (в продакшене здесь будет реальный API запрос)
        await simulateDocumentGeneration(contractData);
        
        // Показываем результат
        showResult();
        
    } catch (error) {
        console.error('Ошибка генерации:', error);
        showNotification('Ошибка при генерации документов. Попробуйте еще раз.', 'error');
        generateBtn.disabled = false;
        generateBtn.textContent = '🚀 Сгенерировать документы';
    }
}

// ==============================================
// ПОДГОТОВКА ДАННЫХ ДЛЯ ДОГОВОРА
// ==============================================
function prepareContractData() {
    const today = new Date();
    const contractNumber = 'МКЛ-' + today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 1000);
    
    // Расчет оплат
    const advancePayment = Math.round(formData.totalCost * 0.3);
    const interimPayment = Math.round(formData.totalCost * 0.6);
    const finalPayment = formData.totalCost - advancePayment - interimPayment;
    
    // Расчет сроков
    const area = formData.area;
    const workingDays = Math.ceil(30 + (area / 100) * 5); // Базовый расчет
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 5); // +5 дней от аванса
    
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + workingDays);
    
    return {
        // Номер и дата договора
        contractNumber: contractNumber,
        contractDate: formatDate(today),
        contractCity: 'Москва',
        
        // Подрядчик
        contractor: CONFIG.contractorData,
        
        // Заказчик
        customer: {
            fullName: formData.fullName,
            inn: formData.inn,
            kpp: formData.kpp,
            ogrn: formData.ogrn,
            legalAddress: formData.legalAddress,
            director: formData.director
        },
        
        // Контакты
        contact: {
            name: formData.contactName,
            phone: formData.phone,
            email: formData.email,
            objectAddress: formData.objectAddress
        },
        
        // Параметры проекта
        project: {
            length: formData.length,
            width: formData.width,
            height: formData.height,
            area: formData.area,
            executionType: formData.executionType,
            wallThickness: formData.wallThickness,
            roofThickness: formData.roofThickness,
            windowsCount: formData.windowsCount || 0,
            gatesCount: formData.gatesCount || 0,
            waterSystem: formData.waterSystem === 'yes'
        },
        
        // Финансы
        pricing: {
            totalCost: formData.totalCost,
            advancePayment: advancePayment,
            interimPayment: interimPayment,
            finalPayment: finalPayment,
            vatAmount: Math.round(formData.totalCost * 0.2 / 1.2) // НДС 20%
        },
        
        // Сроки
        timeline: {
            startDate: formatDate(startDate),
            completionDate: formatDate(completionDate),
            workingDays: workingDays
        },
        
        // Дополнительно
        additionalNotes: formData.additionalNotes || ''
    };
}

// ==============================================
// ИМИТАЦИЯ ГЕНЕРАЦИИ ДОКУМЕНТОВ
// ==============================================
async function simulateDocumentGeneration(data) {
    // Имитация серверного процесса
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Сохраняем данные в sessionStorage для возможности повторной генерации
    sessionStorage.setItem('contractData', JSON.stringify(data));
    
    // В реальном приложении здесь был бы запрос к API:
    /*
    const response = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate documents');
    }
    
    const result = await response.json();
    return result.files;
    */
    
    return true;
}

// ==============================================
// ПОКАЗ РЕЗУЛЬТАТА
// ==============================================
function showResult() {
    // Скрываем форму
    document.querySelector('.contract-form-container').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
    
    // Показываем результат
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.style.display = 'block';
    
    // Настраиваем ссылки на скачивание
    setupDownloadLinks();
    
    // Прокрутка наверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==============================================
// НАСТРОЙКА ССЫЛОК СКАЧИВАНИЯ
// ==============================================
function setupDownloadLinks() {
    const contractData = JSON.parse(sessionStorage.getItem('contractData'));
    
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const format = this.dataset.format;
            downloadDocument(format, contractData);
        });
    });
}

// ==============================================
// СКАЧИВАНИЕ ДОКУМЕНТА
// ==============================================
function downloadDocument(format, data) {
    // В реальном приложении здесь был бы запрос на сервер
    // Для демо создаем текстовый файл с данными
    
    let content = generateDocumentContent(data);
    let filename = `Договор_${data.contractNumber}.${format === 'zip' ? 'txt' : format}`;
    let mimeType = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'zip': 'application/zip'
    }[format] || 'text/plain';
    
    // Создаем blob и скачиваем
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Документ ${filename} скачан`, 'success');
}

// ==============================================
// ГЕНЕРАЦИЯ СОДЕРЖИМОГО ДОКУМЕНТА (ДЕМО)
// ==============================================
function generateDocumentContent(data) {
    return `
ДОГОВОР СТРОИТЕЛЬНОГО ПОДРЯДА № ${data.contractNumber}

${data.contractCity}, ${data.contractDate}

ЗАКАЗЧИК: ${data.customer.fullName}
ИНН: ${data.customer.inn} КПП: ${data.customer.kpp} ОГРН: ${data.customer.ogrn}
Адрес: ${data.customer.legalAddress}
Руководитель: ${data.customer.director}

ПОДРЯДЧИК: ${data.contractor.fullName}
ИНН: ${data.contractor.inn} КПП: ${data.contractor.kpp} ОГРН: ${data.contractor.ogrn}
Адрес: ${data.contractor.legalAddress}

1. ПРЕДМЕТ ДОГОВОРА

Подрядчик обязуется выполнить работы по строительству быстровозводимого здания:
- Габариты: ${data.project.length} м × ${data.project.width} м × ${data.project.height} м
- Площадь: ${data.project.area} м²
- Тип исполнения: ${data.project.executionType}
- Адрес объекта: ${data.contact.objectAddress}

2. СТОИМОСТЬ РАБОТ

Общая стоимость: ${formatNumber(data.pricing.totalCost)} руб. (в т.ч. НДС 20%: ${formatNumber(data.pricing.vatAmount)} руб.)

Порядок оплаты:
- Аванс (30%): ${formatNumber(data.pricing.advancePayment)} руб.
- Промежуточный платеж (60%): ${formatNumber(data.pricing.interimPayment)} руб.
- Окончательный расчет (10%): ${formatNumber(data.pricing.finalPayment)} руб.

3. СРОКИ ВЫПОЛНЕНИЯ

Начало работ: ${data.timeline.startDate}
Окончание работ: ${data.timeline.completionDate}
Срок выполнения: ${data.timeline.workingDays} рабочих дней

4. КОНТАКТНАЯ ИНФОРМАЦИЯ

Контактное лицо Заказчика: ${data.contact.name}
Телефон: ${data.contact.phone}
Email: ${data.contact.email}

5. ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА

Подрядчик предоставляет гарантию на конструкцию сроком 5 лет.

${data.additionalNotes ? '\n6. ДОПОЛНИТЕЛЬНЫЕ УСЛОВИЯ\n' + data.additionalNotes : ''}

ЗАКАЗЧИК:                    ПОДРЯДЧИК:
___________________         ___________________
${data.customer.director}   ${data.contractor.director}

М.П.                        М.П.
`;
}

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

function showLoading() {
    // Можно добавить оверлей с индикатором загрузки
}

function showNotification(message, type = 'info') {
    // Простое уведомление через alert (можно заменить на более красивое)
    const icons = {
        'success': '✓',
        'error': '⚠',
        'info': 'ℹ',
        'warning': '⚠'
    };
    
    const icon = icons[type] || icons.info;
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `${icon} ${message}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#0D47A1'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Стили для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);