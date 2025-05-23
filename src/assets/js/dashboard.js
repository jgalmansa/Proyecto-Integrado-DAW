// En dasjhboard.html, tengo esto <button class="nav-item flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50" data-section="manage-workspaces">
//     <div class="text-center">
//         <i class="fas fa-plus-circle text-2xl text-blue-500 mb-2"></i>
//         <p class="text-sm font-medium text-gray-700">Crear Espacio</p>
//     </div>
// </button>

// Haz que funcione el boton de crear espacio

const createWorkspaceBtn = document.getElementById('create-workspace-btn');
createWorkspaceBtn.addEventListener('click', function() {
    window.location.href = '/workspace-create';
});