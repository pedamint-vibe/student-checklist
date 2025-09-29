// 요구된 기능만 구현: 1) 제목 표시(HTML), 2) 학생 1~30행과 항목(출석/숙제/준비물) 체크박스, 3) 전체 출석 요약 표시

(function () {
    const NUM_STUDENTS = 30;
    const STORAGE_KEY = 'student-checklist-data';
    const checklistBody = document.getElementById('checklistBody');
    const attendanceSummary = document.getElementById('attendanceSummary');
    const headerRow = document.getElementById('headerRow');
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemForm = document.getElementById('addItemForm');
    const newItemNameInput = document.getElementById('newItemName');
    const cancelAddBtn = document.getElementById('cancelAdd');

    // 초기 항목 구성: 출석, 숙제, 준비물
    // 첫 번째 항목(출석)은 삭제 불가로 보호
    const defaultItemList = [
        { key: 'attend', label: '출석', removable: false },
        { key: 'homework', label: '숙제', removable: true },
        { key: 'supplies', label: '준비물', removable: true },
    ];

    // 로컬 스토리지에서 데이터 로드
    function loadFromStorage() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);
                return {
                    itemList: data.itemList || defaultItemList,
                    checklistData: data.checklistData || {}
                };
            }
        } catch (error) {
            console.error('로컬 스토리지 로드 실패:', error);
        }
        return {
            itemList: [...defaultItemList],
            checklistData: {}
        };
    }

    // 로컬 스토리지에 데이터 저장
    function saveToStorage() {
        try {
            const data = {
                itemList: itemList,
                checklistData: getCurrentChecklistData()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('로컬 스토리지 저장 실패:', error);
        }
    }

    // 현재 체크리스트 데이터 수집
    function getCurrentChecklistData() {
        const data = {};
        const checkboxes = checklistBody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                data[checkbox.name] = true;
            }
        });
        return data;
    }

    // 저장된 체크리스트 데이터 적용
    function applyChecklistData(checklistData) {
        Object.keys(checklistData).forEach(name => {
            const checkbox = checklistBody.querySelector(`input[name="${name}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // 로컬 스토리지에서 데이터 로드
    const { itemList, checklistData } = loadFromStorage();

    function createCell(content) {
        const td = document.createElement('td');
        if (content instanceof HTMLElement) {
            td.appendChild(content);
        } else {
            td.textContent = String(content);
        }
        return td;
    }

    function createCheckbox(name, value) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = name;
        input.value = value;
        return input;
    }

    function updateAttendanceSummary() {
        const presentCount = checklistBody.querySelectorAll('input[name^="attend-"]:checked').length;
        attendanceSummary.textContent = `${presentCount} / ${NUM_STUDENTS}`;
    }

    function buildHeader() {
        // 번호 다음으로 항목 헤더 생성
        // 기존 생성된 헤더 제거 후 재생성
        while (headerRow.children.length > 1) {
            headerRow.removeChild(headerRow.lastElementChild);
        }
        itemList.forEach((item) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.className = 'item-col';
            th.dataset.key = item.key;
            const labelSpan = document.createElement('span');
            labelSpan.textContent = item.label;
            th.appendChild(labelSpan);
            if (item.removable) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'col-remove-btn';
                btn.title = `${item.label} 삭제`;
                btn.setAttribute('aria-label', `${item.label} 항목 삭제`);
                btn.textContent = '×';
                btn.addEventListener('click', () => removeItemColumn(item.key));
                th.appendChild(btn);
            }
            // 일괄 완료/해제 버튼
            const completeBtn = document.createElement('button');
            completeBtn.type = 'button';
            completeBtn.className = 'col-complete-btn';
            completeBtn.title = `${item.label} 일괄 완료`;
            completeBtn.setAttribute('aria-label', `${item.label} 항목 일괄 완료`);
            completeBtn.textContent = '✓';
            completeBtn.addEventListener('click', () => bulkSetColumn(item.key, true));
            th.appendChild(completeBtn);

            const uncompleteBtn = document.createElement('button');
            uncompleteBtn.type = 'button';
            uncompleteBtn.className = 'col-uncomplete-btn';
            uncompleteBtn.title = `${item.label} 일괄 해제`;
            uncompleteBtn.setAttribute('aria-label', `${item.label} 항목 일괄 해제`);
            uncompleteBtn.textContent = '↺';
            uncompleteBtn.addEventListener('click', () => bulkSetColumn(item.key, false));
            th.appendChild(uncompleteBtn);
            headerRow.appendChild(th);
        });
    }

    function buildTableRows() {
        const fragment = document.createDocumentFragment();
        for (let studentNumber = 1; studentNumber <= NUM_STUDENTS; studentNumber++) {
            const tr = document.createElement('tr');

            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = String(studentNumber);
            tr.appendChild(th);

            itemList.forEach((item) => {
                const checkbox = createCheckbox(`${item.key}-${studentNumber}`, 'yes');
                if (item.key === 'attend') {
                    checkbox.addEventListener('change', updateAttendanceSummary);
                }
                checkbox.addEventListener('change', () => updateItemCompletionState(item.key));
                tr.appendChild(createCell(checkbox));
            });

            fragment.appendChild(tr);
        }
        checklistBody.appendChild(fragment);
    }

    function addItemColumn(label) {
        const safeKey = `${label}`.trim().replace(/\s+/g, '-');
        if (!safeKey) return;
        // 키 중복 방지: 이미 존재하면 무시
        if (itemList.some((i) => i.key.toLowerCase() === safeKey.toLowerCase())) return;
        const newItem = { key: safeKey, label: label.trim(), removable: true };
        itemList.push(newItem);
        // 헤더 업데이트
        buildHeader();
        // 각 행에 체크박스 셀 추가
        const rows = Array.from(checklistBody.querySelectorAll('tr'));
        rows.forEach((tr, idx) => {
            const studentNumber = idx + 1;
            const checkbox = createCheckbox(`${newItem.key}-${studentNumber}`, 'yes');
            checkbox.addEventListener('change', () => updateItemCompletionState(newItem.key));
            tr.appendChild(createCell(checkbox));
        });
        updateItemCompletionState(newItem.key);
        // 항목 추가 시 로컬 스토리지 저장
        saveToStorage();
    }

    function removeItemColumn(key) {
        // 보호 항목은 제거하지 않음
        const meta = itemList.find((i) => i.key === key);
        if (!meta || !meta.removable) return;
        // itemList에서 제거
        const index = itemList.findIndex((i) => i.key === key);
        if (index === -1) return;
        itemList.splice(index, 1);
        // 헤더 재구성
        buildHeader();
        // 각 행에서 해당 열 제거: 열 인덱스는 번호 헤더(0) 이후 itemList 이전 상태 기준
        // 현재 DOM에서는 마지막에 새 항목들이 붙어 있으므로, 안전하게 각 행에서 key로 탐색하여 제거
        const rows = Array.from(checklistBody.querySelectorAll('tr'));
        rows.forEach((tr) => {
            const cellIndexToRemove = Array.from(tr.children).findIndex((cell, idx) => {
                if (idx === 0) return false; // 번호 열 제외
                const input = cell.querySelector('input[type="checkbox"]');
                return input && input.name.startsWith(`${key}-`);
            });
            if (cellIndexToRemove > 0) {
                tr.removeChild(tr.children[cellIndexToRemove]);
            }
        });
        updateAttendanceSummary();
        // 항목 삭제 시 로컬 스토리지 저장
        saveToStorage();
    }

    function bulkSetColumn(key, checked) {
        const rows = Array.from(checklistBody.querySelectorAll('tr'));
        rows.forEach((tr) => {
            const checkbox = Array.from(tr.querySelectorAll('input[type="checkbox"]')).find((i) => i.name.startsWith(`${key}-`));
            if (!checkbox) return;
            const shouldChange = checked ? !checkbox.checked : checkbox.checked;
            if (shouldChange) {
                checkbox.checked = checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        updateItemCompletionState(key);
        if (key === 'attend') updateAttendanceSummary();
    }

    function updateItemCompletionState(key) {
        const th = headerRow.querySelector(`th.item-col[data-key="${key}"]`);
        if (!th) return;
        const total = NUM_STUDENTS;
        const checked = checklistBody.querySelectorAll(`input[name^="${key}-"]:checked`).length;
        if (checked === total) {
            th.classList.add('completed');
        } else {
            th.classList.remove('completed');
        }
        // 항목 완료 상태 변경 시 로컬 스토리지 저장
        saveToStorage();
    }

    // UI 이벤트: 새 항목 추가
    addItemBtn.addEventListener('click', () => {
        addItemForm.setAttribute('aria-hidden', 'false');
        newItemNameInput.focus();
    });
    cancelAddBtn.addEventListener('click', () => {
        addItemForm.setAttribute('aria-hidden', 'true');
        newItemNameInput.value = '';
    });
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const label = newItemNameInput.value.trim();
        if (!label) return;
        addItemColumn(label);
        newItemNameInput.value = '';
        addItemForm.setAttribute('aria-hidden', 'true');
    });

    // 초기 렌더링
    buildHeader();
    buildTableRows();
    // 저장된 체크리스트 데이터 적용
    applyChecklistData(checklistData);
    // 출석 현황 업데이트 (체크박스 상태 복원 후)
    updateAttendanceSummary();
    // 초기 각 항목의 완료 상태 반영
    itemList.forEach((i) => updateItemCompletionState(i.key));
})();


