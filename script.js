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

        // Étape 1 : Récupérer la ligne du joueur qui vient d'être cliquée
        const ligneJoueur = document.getElementById(idUniqueRow);
        if (!ligneJoueur) return;

        // Étape 2 : Supprimer une ancienne boîte de détails déjà ouverte dans ce tableau pour éviter les doublons
        const tableauBody = ligneJoueur.parentElement;
        const ancienDetail = tableauBody.querySelector('.row-details-temporaire');
        
        // Si on clique sur la même ligne alors que le détail est déjà ouvert, on le ferme (effet bascule)
        if (ancienDetail && ancienDetail.previousElementSibling === ligneJoueur) {
            ancienDetail.remove();
            return;
        }
        if (ancienDetail) ancienDetail.remove();

        // Étape 3 : Configuration de vos champs mis à jour
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

        // Étape 4 : Création de la nouvelle ligne de tableau pour accueillir les tuiles
        const nouvelleLigne = document.createElement('tr');
        nouvelleLigne.className = 'row-details-temporaire';
        // AJOUT NOUVEAU : On lie cette ligne de détails à l'ID de la ligne du joueur
        nouvelleLigne.setAttribute('data-id-ligne', idUniqueRow);

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

        // Étape 5 : Insérer graphiquement la nouvelle ligne juste après la ligne cliquée
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

                        // Regroupement par code_match
            var groupes = {};
            donneesGlobalesMatchs.forEach(function(item, index) {
                // On stocke l'index global d'origine de l'objet pour s'y retrouver au clic
                item._indexGlobal = index; 

                if (!groupes[item.code_match]) {
                    groupes[item.code_match] = [];
                }
                groupes[item.code_match].push(item);
            });

            container.innerHTML = "";

            // --- NOUVEAU : Tri des blocs de matchs par nombre de joueurs ---
            // On extrait les codes de match dans un tableau pour pouvoir les trier
            var codesMatchsTries = Object.keys(groupes);
            
            codesMatchsTries.sort(function(matchA, matchB) {
                // Tri décroissant : le match avec le plus de joueurs (longueur du tableau) passe devant
                return groupes[matchB].length - groupes[matchA].length;
            });

                        // Génération de l'affichage pour chaque match (dans le nouvel ordre trié par nb de joueurs)
            codesMatchsTries.forEach(function(codeMatch) {
                var listeJoueurs = groupes[codeMatch];








                // --- APPLICATION DU TRI MULTICRITÈRE ---
                listeJoueurs.sort(function(a, b) {
                    var diffScoreNet = extraireScoreNumerique(b.score_net) - extraireScoreNumerique(a.score_net);
                    if (diffScoreNet !== 0) return diffScoreNet;

                    var diffZones = (parseInt(b.zones_arrivee, 10) || 0) - (parseInt(a.zones_arrivee, 10) || 0);
                    if (diffZones !== 0) return diffZones;

                    var diffManches = (parseInt(b.manches_parfaites, 10) || 0) - (parseInt(a.manches_parfaites, 10) || 0);
                    if (diffManches !== 0) return diffManches;

                    var diffBilles = (parseInt(b.billes_empochees, 10) || 0) - (parseInt(a.billes_empochees, 10) || 0);
                    if (diffBilles !== 0) return diffBilles;

                    return (parseInt(a.fautes, 10) || 0) - (parseInt(b.fautes, 10) || 0);
                });

                var matchSection = document.createElement('div');
                matchSection.className = 'match-section';
                matchSection.id = 'section-' + codeMatch;

                // --- AJOUT : Récupération du nombre de manches ---
                var nbManches = listeJoueurs[0] && listeJoueurs[0].nb_manches ? listeJoueurs[0].nb_manches : '-';

                // Titre mis à jour avec le code du match, le nombre de manches et le nombre de joueurs
                var html = '<h2 class="match-title">Match : ' + echapperHTML(codeMatch) + ' <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">(' + nbManches + ' manches &bull; ' + listeJoueurs.length + ' joueurs)</span></h2>';
                html += '<table class="leaderboard-table">';
                html += '<thead><tr><th>Pos</th><th>Joueur</th><th>Date</th><th style="text-align:right; padding-right:15px;">Score</th></tr></thead>';
                html += '<tbody id="table-body-' + codeMatch + '">';

                listeJoueurs.forEach(function(joueur, idx) {
                    var rang = idx + 1;
                    var classeMasquee = rang > 3 ? 'row-hidden js-row-extra' : '';
                    var classeRang = rang <= 3 ? 'rank rank-' + rang : '';
                    
                    var dateFormatee = joueur.created_at ? formaterDate(joueur.created_at) : (joueur.date ? formaterDate(joueur.date) : '-');
                    var rowId = 'row-' + codeMatch + '-' + rang;

                    html += '<tr id="' + rowId + '" class="' + classeMasquee + '" onclick="afficherDetailsJoueur(\'' + rowId + '\', ' + joueur._indexGlobal + ')">';
                    html += '<td class="' + classeRang + '">' + rang + '</td>';
                    html += '<td><strong>' + echapperHTML(joueur.nom_joueur) + '</strong></td>';
                    html += '<td class="date-cell">' + dateFormatee + '</td>';
                    html += '<td class="score-cell ' + classeRang + '" style="text-align:right; padding-right:15px;">' + echapperHTML(joueur.score_net) + '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';

                if (listeJoueurs.length > 3) {
                    var restants = listeJoueurs.length - 3;
                    html += '<button id="btn-' + codeMatch + '" class="toggle-btn" onclick="basculerAffichageMatch(\'' + codeMatch + '\', ' + listeJoueurs.length + ')">Voir plus (+' + restants + ')</button>';
                }

                matchSection.innerHTML = html;
                container.appendChild(matchSection);
            });



            // [ ... Votre boucle codesMatchsTries.forEach(function(codeMatch) { ... }) reste identique ici ... ]

            // --- NOUVEAU : Initialisation dynamique du Filtre de Match ---
            var selectFiltre = document.getElementById('filtre-match');
            if (selectFiltre) {
                // On réinitialise les options pour garder uniquement "Tous les matchs"
                selectFiltre.innerHTML = '<option value="tous">🏆 Tous les matchs</option>';
                
                // On ajoute chaque code de match disponible dans le menu déroulant
                codesMatchsTries.forEach(function(codeMatch) {
                    var option = document.createElement('option');
                    option.value = codeMatch;
                    option.textContent = "Match : " + codeMatch + " (" + groupes[codeMatch].length + " joueurs)";
                    selectFiltre.appendChild(option);
                });

                // Écouteur d'événement lors du changement de filtre
                selectFiltre.addEventListener('change', function() {
                    var valeurSelectionnee = this.value;
                    var toutesLesSections = document.querySelectorAll('.match-section');

                    // Fermer une éventuelle tuile de détails ouverte pour éviter les bugs graphiques hors-champ
                    const detailOuvert = document.querySelector('.row-details-temporaire');
                    if (detailOuvert) detailOuvert.remove();

                    toutesLesSections.forEach(function(section) {
                        if (valeurSelectionnee === 'tous' || section.id === 'section-' + valeurSelectionnee) {
                            section.style.display = 'block'; // Affiche le match sélectionné ou tous
                        } else {
                            section.style.display = 'none';  // Masque les autres
                        }
                    });
                });
            }

        } catch (erreur) {
            console.error(erreur);
            container.innerHTML = '<div class="no-data" style="color: #f87171;">Erreur lors du chargement des scores.</div>';
        }
    }




    document.addEventListener('DOMContentLoaded', chargerClassement);

    // --- NOUVEAU : Fermeture automatique lors d'un clic à l'extérieur ---
    document.addEventListener('click', function(evenement) {
        // On cherche si une ligne de détails est actuellement affichée
        const detailOuvert = document.querySelector('.row-details-temporaire');
        if (!detailOuvert) return; // Rien n'est ouvert, on ne fait rien

        // On récupère l'ID de la ligne du joueur associée à ce détail
        const idLigneJoueur = detailOuvert.getAttribute('data-id-ligne');
        const ligneJoueur = document.getElementById(idLigneJoueur);

        // On vérifie si le clic a eu lieu à l'INTÉRIEUR de la boîte de détails
        const clicDansDetails = detailOuvert.contains(evenement.target);
        // On vérifie si le clic a eu lieu sur la ligne du joueur (pour éviter de bloquer la fonction d'ouverture/bascule)
        const clicSurLigneJoueur = ligneJoueur && ligneJoueur.contains(evenement.target);

        // Si le clic n'est ni dans les détails, ni sur la ligne du joueur, on ferme !
        if (!clicDansDetails && !clicSurLigneJoueur) {
            detailOuvert.remove();
        }
    });

