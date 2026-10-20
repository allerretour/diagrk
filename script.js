const SUPABASE_URL = "https://bjwizitnhvcuvphdvvxx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hSQEsCXaQs7O7W-lNCgmwA_gKZ_m-T_";
const SUPABASE_TABLE_NAME = "matchs";

// Stockage global des données brutes pour les tuiles au clic
let donneesGlobalesMatchs = [];

function echapperHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, function(tag) {
        var equivalences = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return equivalences[tag] || tag;
    });
}

function extraireScoreNumerique(scoreTexte) {
    if (!scoreTexte) return 0;
    var nombreSains = scoreTexte.toString().replace('*', '').trim();
    return parseInt(nombreSains, 10) || 0;
}

function formaterDate(dateString) {
    if (!dateString) return "-";
    try {
        var date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', ' à');
    } catch (e) {
        return "-";
    }
}

window.basculerAffichageMatch = function(codeMatch, totalJoueurs) {
    var tbody = document.getElementById('table-body-' + codeMatch);
    var btn = document.getElementById('btn-' + codeMatch);
    if (!tbody || !btn) return;

    var lignesMasquees = tbody.querySelectorAll('.js-row-extra');
    if (lignesMasquees.length === 0) return;

    var estMasque = lignesMasquees[0].classList.contains('row-hidden');
    
    lignesMasquees.forEach(function(ligne) {
        if (estMasque) {
            ligne.classList.remove('row-hidden');
        } else {
            ligne.classList.add('row-hidden');
        }
    });

    if (estMasque) {
        btn.textContent = "Voir moins";
    } else {
        var nbRestants = totalJoueurs - 3;
        btn.textContent = "Voir plus (+" + nbRestants + ")";
    }
};

// --- FONCTION DE GÉNÉRATION DES TUILES DIRECTEMENT SOUS LA LIGNE ---
window.afficherDetailsJoueur = function(idUniqueRow, indexGlobal) {
    const item = donneesGlobalesMatchs[indexGlobal];
    if (!item) return;

    const ligneJoueur = document.getElementById(idUniqueRow);
    if (!ligneJoueur) return;

    const tableauBody = ligneJoueur.parentElement;
    const ancienDetail = tableauBody.querySelector('.row-details-temporaire');
    
    if (ancienDetail && ancienDetail.previousElementSibling === ligneJoueur) {
        ancienDetail.remove();
        return;
    }
    if (ancienDetail) ancienDetail.remove();

    const configChamps = [
        { cle: 'score_net', label: 'Score Net', icone: '🎯', vedette: true },
        { cle: 'score_brut', label: 'Score Brut', icone: '📊' },
        { cle: 'zones_arrivee', label: 'Zones Arrivée', icone: '🏁' },
        { cle: 'manches_parfaites', label: 'Manches Parfaites', icone: '⭐' },
        { cle: 'billes_empochees', label: 'Billes Empochées', icone: '🎱' },
        { cle: 'fautes', label: 'Fautes', icone: '⚠️' },
        { cle: 'ajust_table', label: 'Ajust. Table', icone: '🔧', booleen: true },
        { cle: 'ajust_poche', label: 'Ajust. Poche', icone: '📐', booleen: true },
        { cle: 'nb_manches', label: 'Nb Manches', icone: '🔄' }
    ];

    const nouvelleLigne = document.createElement('tr');
    nouvelleLigne.className = 'row-details-temporaire';

    let htmlTuiles = `
        <td colspan="4" style="padding: 15px; background-color: #111827; border-bottom: 1px solid #334155;">
            <div class="details-container" style="margin-top: 0; padding: 10px; background: transparent; border: none;">
                <div class="details-header">
                    <h3>📈 Statistiques détaillées</h3>
                    <button class="close-details-btn" onclick="this.closest('.row-details-temporaire').remove()">×</button>
                </div>
                <div class="grille-tuiles">
    `;

    configChamps.forEach(conf => {
        let val = item[conf.cle];
        if (conf.booleen) {
            val = val ? '✅ Oui' : '❌ Non';
        } else if (val === null || val === undefined || val === '') {
            val = '-';
        }

        htmlTuiles += `
            <div class="tuile ${conf.vedette ? 'tuile-vedette' : ''}">
                <div class="tuile-icone">${conf.icone}</div>
                <div class="tuile-contenu">
                    <span class="tuile-label">${conf.label}</span>
                    <span class="tuile-valeur" title="${echapperHTML(val.toString())}">${echapperHTML(val.toString())}</span>
                </div>
            </div>
        `;
    });

    htmlTuiles += `
                </div>
            </div>
        </td>
    `;
    
    nouvelleLigne.innerHTML = htmlTuiles;
    ligneJoueur.insertAdjacentElement('afterend', nouvelleLigne);
    nouvelleLigne.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

async function chargerClassement() {
    var container = document.getElementById('classement-container');
    var urlSupabase = SUPABASE_URL + '/rest/v1/' + SUPABASE_TABLE_NAME + '?select=*';

    try {
        var reponse = await fetch(urlSupabase, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!reponse.ok) throw new Error("Erreur réseau");

        donneesGlobalesMatchs = await reponse.json();

        if (donneesGlobalesMatchs.length === 0) {
            container.innerHTML = '<div class="no-data">Aucun score disponible.</div>';
            return;
        }

        var groupes = {};
        donneesGlobalesMatchs.forEach(function(item, index) {
            item._indexGlobal = index; 
            if (!groupes[item.code_match]) {
                groupes[item.code_match] = [];
            }
            groupes[item.code_match].push(item);
        });

        container.innerHTML = "";

        var codesMatchsTries = Object.keys(groupes);
        codesMatchsTries.sort(function(matchA, matchB) {
            return groupes[matchB].length - groupes[matchA].length;
        });

        codesMatchsTries.forEach(function(codeMatch) {
            var listeJoueurs = groupes[codeMatch];
            
            // Tri des joueurs du match par score décroissant
            listeJoueurs.sort(function(a, b) {
                return extraireScoreNumerique(b.score_net) - extraireScoreNumerique(a.score_net);
            });

            var section = document.createElement('div');
            section.className = 'match-section';

            var dateMatch = listeJoueurs[0] ? formaterDate(listeJoueurs[0].created_at) : '-';

            var htmlHTML = `
                <h2 class="match-title">
                    <span>Match : ${echapperHTML(codeMatch)}</span>
                    <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">${dateMatch}</span>
                </h2>
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Joueur</th>
                            <th>Date</th>
                            <th style="text-align: right; padding-right: 15px;">Score</th>
                        </tr>
                    </thead>
                    <tbody id="table-body-${codeMatch}">
            `;

            listeJoueurs.forEach(function(joueur, index) {
                var position = index + 1;
                var classeRang = position <= 3 ? 'rank-' + position : '';
                var ligneMasquee = position > 3 ? 'js-row-extra row-hidden' : '';
                var idUnique = 'row-' + codeMatch + '-' + position;

                htmlHTML += `
                    <tr id="${idUnique}" class="${ligneMasquee}" onclick="window.afficherDetailsJoueur('${idUnique}', ${joueur._indexGlobal})">
                        <td class="rank ${classeRang}">${position}</td>
                        <td style="font-weight: 500;">${echapperHTML(joueur.nom_joueur)}</td>
                        <td class="date-cell">${dateMatch}</td>
                        <td class="score-cell" style="text-align: right; padding-right: 15px; color: var(--accent-hover);">${extraireScoreNumerique(joueur.score_net)}</td>
                    </tr>
                `;
            });

            htmlHTML += `
                    </tbody>
                </table>
            `;

            if (listeJoueurs.length > 3) {
                var nbRestants = listeJoueurs.length - 3;
                htmlHTML += `<button id="btn-${codeMatch}" class="toggle-btn" onclick="window.basculerAffichageMatch('${codeMatch}', ${listeJoueurs.length})">Voir plus (+${nbRestants})</button>`;
            }

            section.innerHTML = htmlHTML;
            container.appendChild(section);
        });

    } catch (erreur) {
        container.innerHTML = '<div class="no-data" style="color: #ef4444;">Erreur lors du chargement des données.</div>';
        console.error(erreur);
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', chargerClassement);
