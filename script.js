// FINAL CORRECTED VERSION - Rewritten from scratch to eliminate all errors.
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const SHEET_ID = '1_Kgl8UQXRsVATt_BOHYQjVWYKkRIBA12R-qnsBoSUzc';
    const SHEET_NAME = 'បញ្ជឺឈ្មោះរួម';
    const RANGE = 'E9:AA';
    const READ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}&range=${RANGE}`;
    const WRITE_URL = 'https://script.google.com/macros/s/AKfycbxCekjXECxkU-hmWzik1wChzCF7YpWxb7ZA1RHazuxMaUInNRU2nZoe7uh0sdzkXxr6/exec';
    const STORAGE_KEY = 'activeBreaks';
    const DEFAULT_AVATAR = 'https://i.stack.imgur.com/34AD2.jpg';
    const OVERDUE_MINUTES = 15;

    // --- DOM ELEMENTS ---
    const mainTitle = document.querySelector('header h1');
    const employeeInput = document.getElementById('employee-input');
    const employeeDatalist = document.getElementById('employee-list-data');
    const currentDateDisplay = document.getElementById('current-date');
    const recordsContainer = document.getElementById('employee-records-container');
    const filterInput = document.getElementById('filter-input');
    const filterBoxContainer = document.querySelector('.records-card .form-group');
    const recordsCardTitle = document.querySelector('.records-card h2');
    const activeBreakDatalist = document.getElementById('active-break-list');
    const loader = document.getElementById('loader');
    const selectionCard = document.querySelector('.selection-card');

    // --- STATE VARIABLES ---
    let employeeData = [];
    let inactivityTimer;
    let filterInactivityTimer;

    // --- HELPER FUNCTIONS ---
    const showLoader = (show) => {
        loader.style.display = show ? 'flex' : 'none';
    };
    const getBreaksFromStorage = () => {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    };
    const saveBreaksToStorage = (breaks) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(breaks));
    };

    // --- UI & DATE FUNCTIONS ---
    const setKhmerDate = () => {
        const now = new Date();
        const days = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
        const months = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        const khmerNumerals = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
        const toKhmerNumeral = (num) => String(num).split('').map(d => khmerNumerals[d]).join('');
        currentDateDisplay.textContent = `ថ្ងៃ${days[now.getDay()]} ទី${toKhmerNumeral(now.getDate())} ខែ${months[now.getMonth()]} ឆ្នាំ${toKhmerNumeral(now.getFullYear())}`;
    };

    const hideSelectionCard = () => selectionCard.classList.add('hidden');
    const showSelectionCard = () => selectionCard.classList.remove('hidden');
    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(hideSelectionCard, 10000);
    };

    const hideFilterBox = () => filterBoxContainer.classList.add('hidden');
    const showFilterBox = () => filterBoxContainer.classList.remove('hidden');
    const resetFilterTimer = () => {
        clearTimeout(filterInactivityTimer);
        filterInactivityTimer = setTimeout(hideFilterBox, 10000);
    };

    const checkOverdueBreaks = () => {
        const breaks = getBreaksFromStorage();
        const now = new Date();
        breaks.forEach(breakEntry => {
            const recordDiv = recordsContainer.querySelector(`.employee-record[data-id="${breakEntry.id}"]`);
            if (recordDiv) {
                const checkOutTime = new Date(breakEntry.checkOutTime);
                const diffMinutes = (now - checkOutTime) / 60000;
                const overdueStatusEl = recordDiv.querySelector('.overdue-status');
                if (diffMinutes > OVERDUE_MINUTES) {
                    const overdueTime = Math.floor(diffMinutes - OVERDUE_MINUTES);
                    overdueStatusEl.textContent = `លើសកំណត់ ${overdueTime} នាទី`;
                    recordDiv.classList.add('overdue');
                } else {
                    overdueStatusEl.textContent = '';
                    recordDiv.classList.remove('overdue');
                }
            }
        });
    };
    
    // --- DATA & RENDERING FUNCTIONS ---
    const loadEmployeeData = async () => {
        showLoader(true);
        try {
            const response = await fetch(READ_URL);
            const csvText = await response.text();
            const data = csvText.split('\n').map(row => row.split(',').map(cell => cell.replace(/"/g, '')));
            employeeData = data.filter(row => row[0] && row[7]).map(row => ({
                id: row[0], name: row[7], department: row[14] || 'N/A', photoUrl: row[22] || DEFAULT_AVATAR,
                searchValue: `${row[7]} (${row[0]})`
            }));
            employeeDatalist.innerHTML = '';
            employeeData.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.searchValue;
                employeeDatalist.appendChild(option);
            });
        } catch (error) { console.error('Error fetching data:', error); } finally { showLoader(false); }
    };

    const updateActiveBreakDatalist = () => {
        const breaks = getBreaksFromStorage();
        activeBreakDatalist.innerHTML = '';
        breaks.forEach(breakEntry => {
            const option = document.createElement('option');
            option.value = `${breakEntry.name} (${breakEntry.id})`;
            activeBreakDatalist.appendChild(option);
        });
    };
    
    const saveData = async (data) => {
        showLoader(true);
        try {
            await fetch(WRITE_URL, {
                method: 'POST', mode: 'no-cors', cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                redirect: 'follow', body: JSON.stringify(data)
            });
            return true;
        } catch (error) { console.error('Save failed:', error); return false; } finally { showLoader(false); }
    };

    const handleCheckIn = async (employeeId) => {
        const breaks = getBreaksFromStorage();
        const breakEntry = breaks.find(b => b.id === employeeId);
        if (!breakEntry) return;

        const checkOutTime = new Date(breakEntry.checkOutTime);
        const checkInTime = new Date();
        const diffMs = checkInTime - checkOutTime;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.round((diffMs % 3600000) / 60000);
        const duration = `${diffHrs} ម៉ោង ${diffMins} នាទី`;
        
        const dataToSave = {
            employeeId: breakEntry.id, employeeName: breakEntry.name, department: breakEntry.department,
            date: new Date().toLocaleDateString('en-CA'),
            startTime: checkOutTime.toLocaleTimeString('en-GB'),
            stopTime: checkInTime.toLocaleTimeString('en-GB'),
            duration: duration
        };

        const saveSuccess = await saveData(dataToSave);

        if (saveSuccess) {
            const updatedBreaks = breaks.filter(b => b.id !== employeeId);
            saveBreaksToStorage(updatedBreaks);
            const recordDiv = recordsContainer.querySelector(`.employee-record[data-id="${employeeId}"]`);
            if (recordDiv) {
                recordDiv.classList.add('completed');
                setTimeout(() => {
                    recordDiv.style.opacity = '0';
                    recordDiv.style.transform = 'translateX(50px)';
                    setTimeout(() => renderBreakList(), 500);
                }, 1000);
            }
        } else {
             alert('រក្សាទុកទិន្នន័យមិនสำเร็จ! សូមព្យាយាមម្តងទៀត។');
        }
    };

    const addEmployeeToUI = (breakEntry) => {
        const checkOutTime = new Date(breakEntry.checkOutTime);
        const recordDiv = document.createElement('div');
        recordDiv.classList.add('employee-record');
        recordDiv.setAttribute('data-id', breakEntry.id);
        recordDiv.setAttribute('data-search-term', `${breakEntry.name} ${breakEntry.id}`.toLowerCase());

        recordDiv.innerHTML = `
            <div class="employee-photo">
                <img src="${breakEntry.photoUrl}" alt="Photo of ${breakEntry.name}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';">
            </div>
            <div class="employee-info">
                <h4>${breakEntry.name} (${breakEntry.id})</h4>
                <p><strong>ផ្នែក:</strong> ${breakEntry.department}</p>
                <p><strong>ម៉ោងចេញ:</strong> <span class="start-time">${checkOutTime.toLocaleTimeString('en-GB')}</span></p>
                <p><strong>ម៉ោងចូល:</strong> <span class="stop-time">--:--:--</span></p>
                <p><strong>រយៈពេលសម្រាក:</strong> <span class="duration">--</span></p>
                <p class="overdue-status"></p>
            </div>
            <div class="employee-actions">
                <button class="btn btn-delete">លុប</button>
                <button class="btn btn-check-in">ចូល</button> 
            </div>
        `;
        recordsContainer.appendChild(recordDiv);

        const checkInBtn = recordDiv.querySelector('.btn-check-in');
        checkInBtn.addEventListener('click', () => handleCheckIn(breakEntry.id), { once: true });

        const deleteBtn = recordDiv.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            if (confirm(`តើអ្នកពិតជាចង់លុប "${breakEntry.name}" មែនទេ?`)) {
                const breaks = getBreaksFromStorage().filter(b => b.id !== breakEntry.id);
                saveBreaksToStorage(breaks);
                renderBreakList();
            }
        });
    };

    const renderBreakList = () => {
        recordsContainer.innerHTML = '';
        const breaks = getBreaksFromStorage();
        breaks.sort((a, b) => new Date(a.checkOutTime) - new Date(b.checkOutTime));
        breaks.forEach(breakEntry => addEmployeeToUI(breakEntry));
        updateActiveBreakDatalist();
        checkOverdueBreaks();
    };

    // --- EVENT LISTENERS & INITIALIZATION ---
    employeeInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const selectedEmployee = employeeData.find(emp => emp.searchValue === value);
        if (selectedEmployee) {
            const breaks = getBreaksFromStorage();
            if (breaks.some(b => b.id === selectedEmployee.id)) {
                alert('បុគ្គលិកនេះបានចុះឈ្មោះចេញទៅក្រៅរួចហើយ។');
                employeeInput.value = '';
                return;
            }
            const newBreak = {
                id: selectedEmployee.id, name: selectedEmployee.name, department: selectedEmployee.department,
                photoUrl: selectedEmployee.photoUrl, checkOutTime: new Date().toISOString()
            };
            breaks.push(newBreak);
            saveBreaksToStorage(breaks);
            renderBreakList();
            employeeInput.value = '';
        }
    });

    filterInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const records = recordsContainer.querySelectorAll('.employee-record');
        records.forEach(record => {
            const recordSearchTerm = record.getAttribute('data-search-term');
            if (recordSearchTerm.includes(searchTerm)) {
                record.style.display = 'grid';
            } else {
                record.style.display = 'none';
            }
        });
    });

    mainTitle.addEventListener('click', () => {
        showSelectionCard();
        resetInactivityTimer();
    });

    recordsCardTitle.addEventListener('click', () => {
        showFilterBox();
        resetFilterTimer();
    });

    // General activity only resets the timers' countdowns
    ['mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, () => {
            resetInactivityTimer();
            resetFilterTimer();
        });
    });
    
    // Initialize the application
    setKhmerDate();
    loadEmployeeData();
    renderBreakList();
    
    // Start timers for the first time
    resetInactivityTimer();
    resetFilterTimer();
    setInterval(checkOverdueBreaks, 30000);
});
