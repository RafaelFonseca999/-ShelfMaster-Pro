// UI Components
class InventoryComponents {
    static createItemCard(item) {
        const conditionClass = item.condition ? item.condition.toLowerCase().replace(' ', '-') : 'good';
        return `
            <div class="item-card" data-id="${item.id}">
                <div class="item-card-header">
                    <h4>${item.name || 'Unnamed Item'}</h4>
                    ${item.condition ? `<span class="badge badge-${conditionClass}">${item.condition}</span>` : ''}
                </div>
                <div class="item-card-body">
                    ${item.category ? `<p><i class="fas fa-tag"></i> ${item.category}</p>` : ''}
                    ${item.location ? `<p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>` : ''}
                    <p><i class="fas fa-cubes"></i> Quantity: ${item.quantity || 0}</p>
                    ${item.value ? `<p><i class="fas fa-dollar-sign"></i> $${Number(item.value).toFixed(2)}</p>` : ''}
                </div>
                <div class="item-card-footer">
                    <button class="btn btn-secondary btn-sm" onclick="editItem('${item.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    static createDataTable(data, columns, actions = true, entityType = 'item') {
        if (!data || data.length === 0) {
            return '<p class="no-data">No data available</p>';
        }

        const deleteFunction = {
            'item': 'deleteItem',
            'location': 'deleteLocation',
            'category': 'deleteCategory'
        }[entityType] || 'deleteItem';

        const editFunction = `edit${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col.label}</th>`).join('')}
                        ${actions ? '<th>Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${columns.map(col => {
                                let value = row[col.field];
                                if (col.field === 'value' && value) {
                                    value = `$${Number(value).toFixed(2)}`;
                                }
                                return `<td>${value || '-'}</td>`;
                            }).join('')}
                            ${actions ? `
                                <td>
                                    <button class="btn btn-secondary btn-sm" onclick="${editFunction}('${row.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="${deleteFunction}('${row.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    static createModal(id, title, content) {
        return `
            <div class="modal" id="${id}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="closeModal('${id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeModal('${id}')">Cancel</button>
                        <button class="btn btn-primary" onclick="saveModal('${id}')">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    static createLocationTree(locations, level = 0) {
        if (!locations || locations.length === 0) {
            return '<p class="no-data">No locations available</p>';
        }

        const rootLocations = locations.filter(loc => !loc.parent_location_id);
        
        return `
            <div class="location-tree">
                ${rootLocations.map(loc => this.renderLocationNode(loc, locations, level)).join('')}
            </div>
        `;
    }

    static renderLocationNode(location, allLocations, level) {
        const children = allLocations.filter(loc => loc.parent_location_id === location.id);
        
        return `
            <div class="location-item" style="margin-left: ${level * 20}px">
                <i class="fas fa-folder"></i>
                <span>${location.name}</span>
                ${location.description ? `<small>${location.description}</small>` : ''}
                <div class="location-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editLocation('${location.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteLocation('${location.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${children.map(child => this.renderLocationNode(child, allLocations, level + 1)).join('')}
        `;
    }
}

// Make components globally available
window.InventoryComponents = InventoryComponents;

// Modal management - ensure functions are globally defined
function openModal(modalId) {
    console.log('Opening modal:', modalId); // Debug
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    } else {
        console.error('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    console.log('Closing modal:', modalId); // Debug
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function saveModal(modalId) {
    console.log('Saving modal:', modalId); // Debug
    // Delegate to app methods
    if (modalId === 'itemModal' && window.app) {
        window.app.saveItem();
    } else if (modalId === 'locationModal' && window.app) {
        window.app.saveLocation();
    } else if (modalId === 'categoryModal' && window.app) {
        window.app.saveCategory();
    } else if (modalId === 'movementModal' && window.app) {
        window.app.saveMovement();
    }
}

// Auth functions
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    const activeTab = document.querySelector(`.auth-tab[onclick*="${tab}"]`);
    const activeForm = document.getElementById(`${tab}-form`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeForm) activeForm.classList.add('active');
}