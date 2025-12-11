const fs = require('fs');

const file = 'PlanningRH.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `  // Priorité : Congé validé
  if (conge) {
    return (
      <div
        ref={drop}
        title={\`\${resumeCell(conge, shift)} - Déplacement interdit (congé prioritaire)\`}
        className={\`flex-1 min-w-[110px] relative p-2 \${cellSizeClass} text-center transition border-r border-gray-200 bg-orange-50 \${
          isOver && !canDrop ? 'ring-2 ring-inset ring-orange-400' : ''
        }\`}
      >
        {isOver && !canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-100/80">
            <span className="text-orange-600 font-medium text-xs">❌ Interdit</span>
          </div>
        )}
        <CongeBadge conge={conge} />
      </div>
    );
  }`;

const newCode = `  // Priorité : Congé validé
  if (conge) {
    // Système de couleurs et icônes par type (BambooHR style)
    let bgGradient = 'from-amber-50 to-orange-50';
    let borderColor = 'border-l-amber-400';
    let icon = '🏖️';
    let iconBg = 'bg-amber-100';
    
    const typeL = (conge.type || '').toLowerCase();
    if (typeL.includes('maladie') || typeL.includes('medical')) {
      bgGradient = 'from-red-50 to-pink-50';
      borderColor = 'border-l-red-400';
      icon = '🏥';
      iconBg = 'bg-red-100';
    } else if (typeL.includes('rtt')) {
      bgGradient = 'from-purple-50 to-indigo-50';
      borderColor = 'border-l-purple-400';
      icon = '📅';
      iconBg = 'bg-purple-100';
    } else if (typeL.includes('sans solde')) {
      bgGradient = 'from-gray-50 to-slate-50';
      borderColor = 'border-l-gray-400';
      icon = '💼';
      iconBg = 'bg-gray-100';
    }
    
    // Statut colors
    let statutBadge = 'bg-amber-100 text-amber-700';
    if (conge.statut === 'approuvé' || conge.statut === 'validé') {
      statutBadge = 'bg-green-100 text-green-700';
    } else if (conge.statut === 'refusé') {
      statutBadge = 'bg-red-100 text-red-700';
    }
    
    return (
      <div
        ref={drop}
        title={\`\${icon} \${conge.type || 'Congé'} - \${conge.statut || 'En attente'}\\n🚫 Déplacement interdit\`}
        className={\`flex-1 min-w-[110px] relative p-1 \${cellSizeClass} transition border-r border-gray-200 bg-gradient-to-br \${bgGradient} \${
          isOver && !canDrop ? 'ring-2 ring-inset ring-orange-400' : ''
        }\`}
      >
        {isOver && !canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-100/90 backdrop-blur-sm rounded z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🚫</span>
              <span className="text-orange-700 font-bold text-xs">Interdit</span>
            </div>
          </div>
        )}
        
        <div className={\`border-l-4 \${borderColor} rounded-r bg-white/60 backdrop-blur-sm shadow-sm p-1.5 h-full flex flex-col justify-center\`}>
          <div className="flex items-center gap-1.5 justify-center mb-1">
            <div className={\`w-5 h-5 \${iconBg} rounded-full flex items-center justify-center text-xs\`}>
              {icon}
            </div>
            <span className="text-[10px] font-bold text-gray-800 truncate">{conge.type || 'Congé'}</span>
          </div>
          <div className={\`text-center text-[8px] font-semibold px-2 py-0.5 rounded-full \${statutBadge}\`}>
            {conge.statut || 'En attente'}
          </div>
        </div>
      </div>
    );
  }`;

if (content.includes(oldCode)) {
  console.log('Found exact match, replacing...');
  const newContent = content.replace(oldCode, newCode);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('✅ Remplacement effectué avec succès!');
} else {
  console.log('❌ Code original non trouvé. Recherche de variantes...');
  // Essayer sans les caractères spéciaux
  const simplified = content.substring(content.indexOf('// Priorité'), content.indexOf('// Priorité') + 1000);
  console.log('Extrait trouvé:', simplified.substring(0, 200));
}
