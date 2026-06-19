export const translations = {
  en: {
    nav: {
      logo: 'GolPool',
      login: 'Log In',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      logout: 'Log Out',
    },
    landing: {
      badge: 'World Cup 2026',
      title: 'Predict. Compete. Win.',
      subtitle:
        'Join friends in a prediction pool for the FIFA World Cup 2026. Score points for every correct result and climb the leaderboard.',
      createPool: 'Create a Pool',
      joinPool: 'Join a Pool',
      feature1Title: 'Easy Predictions',
      feature1Desc: 'Predict scores for every match, from group stage to the final.',
      feature2Title: 'Live Standings',
      feature2Desc: 'Watch your rank update in real time as matches finish.',
      feature3Title: 'Private Pools',
      feature3Desc: 'Invite only your friends with a private join code.',
    },
    auth: {
      loginTitle: 'Welcome back',
      loginSubtitle: 'Log in to your GolPool account',
      signupTitle: 'Create your account',
      signupSubtitle: 'Join GolPool and start predicting',
      forgotTitle: 'Reset your password',
      forgotSubtitle: "Enter your email and we'll send you a verification code",
      resetTitle: 'Set new password',
      resetSubtitle: 'Choose a strong password',
      fullName: 'Full name',
      email: 'Email address',
      password: 'Password',
      confirmPassword: 'Confirm password',
      language: 'Language',
      loginButton: 'Log In',
      signupButton: 'Create Account',
      sendResetLink: 'Send Reset Link',
      resetButton: 'Set New Password',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      forgotPassword: 'Forgot your password?',
      backToLogin: 'Back to login',
      checkEmail: "We sent a 6-digit verification code to {email}. Enter it on the next page to reset your password.",
      checkEmailTitle: 'Check your email ✓',
      enterCode: 'Enter Verification Code →',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      otpTitle: 'Check your email',
      otpSubtitle: 'We sent a verification code to',
      otpCodeLabel: 'Verification code',
      otpVerify: 'Verify',
      otpNoCode: "Didn't receive it?",
      otpResend: 'Resend code',
      otpResent: 'Code resent! Check your inbox.',
      otpInvalid: 'Invalid or expired code. Please try again.',
    },
    predict: {
      title: 'Predictions',
      save: 'Save Predictions',
      saving: 'Saving…',
      saved: 'Saved!',
      deadlineLabel: 'Closes in:',
      closed: 'Predictions closed',
      noMatches: 'No matches scheduled for this round yet.',
      group: 'Group',
      edit: 'Edit',
      cancel: 'Cancel',
      back: '← Dashboard',
      incompleteError: 'Please enter scores for all matches before saving.',
      pts: 'pts',
      officialResult: 'Official Result',
      yourPrediction: 'Your Prediction',
      noPrediction: 'No prediction',
      pointsEarned: 'Points earned',
      roundPoints: 'Round points',
      matchesFinished: 'matches finished',
      viewingPlayer: 'Viewing',
      myPredictions: 'My Predictions',
      selectPlayer: 'View another player…',
      deadlineNotPassed: 'Available after round closes',
      statusFinished: 'Finished',
      statusLive: 'Live',
      statusUpcoming: 'Upcoming',
      correctResult: 'Correct result',
      correctHome: 'Home goals',
      correctAway: 'Away goals',
      correctDiff: 'Goal difference',
      searchPlayer: 'Search player…',
      notPredicted: 'Not predicted yet',
      missingMatches: 'You have {n} matches without predictions. Unpredicted matches won\'t earn points. Continue saving?',
      saveAnyway: 'Save anyway',
      goBack: 'Go back',
      savedCount: '{n} predictions saved!',
      cancelConfirmMsg: 'You have made {n} unsaved predictions. Are you sure you want to cancel? Your changes will be lost.',
      yesDiscard: 'Yes, discard changes',
      keepEditing: 'Keep editing',
      deadlineAt: '· Deadline:',
      tbdMessage: 'Predictions unlock when teams are confirmed',
      exportBtn: '📥 Export Predictions',
      exportPending: 'Pending',
      exportNoPickD: 'No pick',
      allSavedAdvancing: 'All predictions saved! Moving to next round...',
    },
    leaderboard: {
      title: 'Standings',
      player: 'Player',
      total: 'Pts',
      noMembers: 'No approved members yet.',
      back: '← Dashboard',
      bonus: 'Bonus',
      roundTotals: 'Round Totals',
      searchPlayer: 'Search player...',
      showing: 'Showing {n} of {total} players',
      you: 'You',
      roundAverages: 'Round Averages',
    },
    bonus: {
      title: 'Bonus Predictions',
      subtitle: 'Submit before Group Stage Matchday 1 deadline',
      winner: 'Tournament Winner',
      runnerUp: 'Runner-up',
      third: 'Third Place',
      goldenBall: 'Golden Ball – Best Player',
      goldenBoot: 'Golden Boot – Top Scorer',
      goldenGlove: 'Golden Glove – Best Goalkeeper',
      save: 'Save Bonus Predictions',
      saving: 'Saving…',
      saved: '✓ Saved!',
      locked: 'Bonus predictions are now closed',
      placeholder: 'Search…',
      back: '← Dashboard',
      edit: 'Edit',
      cancel: 'Cancel',
      noAnswer: '—',
      incompleteError: 'Please complete all bonus predictions before saving.',
      totalPoints: 'Bonus points',
      viewingPlayer: 'Viewing',
      myPredictions: 'My Bonus Picks',
      searchHint: 'Type to search',
      closesIn: 'Bonus picks close in:',
      deadlineAt: '· Deadline:',
      searchPlayer: 'Search player…',
    },
    tabs: {
      home: 'Home',
      predict: 'Predict',
      bonus: 'Bonus',
      standings: 'Standings',
      summary: 'Insights',
      poolInfo: 'Pool Info',
      manage: 'Manage Pool →',
    },
    summary: {
      title: 'Match Insights',
      selectRound: 'Round',
      selectMatch: 'Match',
      totalPredictions: 'total predictions',
      validScores: 'valid scores',
      didNotPredict: 'did not predict',
      outcomeSummary: 'Outcome Summary',
      mostPopular: 'Most Popular Scores',
      mostPopularBadge: 'MOST POPULAR',
      homeWin: '{team} Win',
      draw: 'Draw',
      awayWin: '{team} Win',
      predictions: 'predictions',
      didNotSubmit: '{n} participants did not submit a score prediction',
      locked: '🔒 Predictions for this match are hidden until the deadline passes',
      pointsEarned: 'Points Earned',
      pointsAverage: 'Average',
      pointsMedian: 'Median',
      pointsTop: 'Top',
      yourPoints: 'Your Points',
      noPrediction: 'No prediction',
      yourPrediction: 'YOUR PREDICTION',
    },
    createPool: {
      title: 'Create a Pool',
      backDashboard: 'Back to dashboard',
      back: 'Back',
      next: 'Next',
      createPool: 'Create Pool',
      creating: 'Creating…',
      genericError: 'Something went wrong',

      step1Label: 'Pool Basics',
      nameLabel: 'Pool name',
      namePlaceholder: 'e.g. Office Champions 2026',
      descLabel: 'Description',
      descPlaceholder: 'A short description of your pool…',
      currencyLabel: 'Currency',
      currencyForPrizesLabel: 'Currency for prizes',
      optional: 'optional',
      nameRequired: 'Pool name is required.',

      joinModeQuestion: 'How should members join?',
      joinModeApproval: 'Admin approval required',
      joinModeApprovalDesc: 'You review and approve each join request',
      joinModeOpen: 'Anyone with the link can join',
      joinModeOpenDesc: 'Anyone with the invite link joins instantly',

      step2Label: 'Prize Setup',
      hasPrizeQuestion: 'Will this pool have a prize?',
      yesPrize: "Yes, there's a prize",
      yesPrizeDesc: 'Define fixed amounts or split the entry fees.',
      noPrize: 'No prize',
      noPrizeDesc: 'Just for fun — no money involved.',
      prizeChoiceRequired: 'Please choose whether this pool has a prize.',
      prizeTypeQuestion: 'How do you want to set up the prize?',
      fixedPrize: 'Fixed prizes',
      fixedPrizeDesc: "I'll define the exact amounts for each place.",
      perEntry: 'Entry fee — split the pot',
      perEntryDesc: 'Everyone pays to enter and we split the prize pool.',
      prizeTypeRequired: 'Please select a prize type.',

      step3aLabel: 'Fixed Prize Amounts',
      fixedDesc: 'Set the prize for each place. Only 1st place is required.',
      first: '1st Place',
      second: '2nd Place',
      third: '3rd Place',
      prize1stRequired: '1st place prize amount is required.',
      prizePoolPreview: 'Prize pool',
      total: 'total',

      step3bLabel: 'Entry Fee & Distribution',
      entryFeeLabel: 'Entry fee per person',
      entryFeeRequired: 'Entry fee is required.',
      distLabel: 'Prize distribution',
      pctRequired: '1st place percentage is required.',
      pctMustBe100: 'Percentages must add up to 100% (currently {n}%).',
      winnerTakesAll: 'Winner Takes All!',
      exampleWith10: 'Example with 10 players',
      pot: 'Total pot',
      perPerson: 'Entry fee',

      step4Label: 'Review & Create',
    },
    admin: {
      removeButton: 'Remove',
      removeConfirm: 'Remove {name} from this pool? Their predictions will also be deleted.',
      archivePool: 'Archive Pool',
      archiveConfirm: 'Archive this pool? It will be hidden from your dashboard but all data will be preserved.',
      archiveSuccess: 'Pool archived',
      archiving: 'Archiving…',
      exportMembers: 'Export Members',
      exportFilename: 'Members',
      openPool: 'Open pool',
      approvalRequired: 'Approval required',
      removedMembers: 'Removed Members',
      restore: 'Restore',
      officialBonusResults: '🏆 Official Bonus Results',
      saveOfficialResults: 'Save & Calculate Points',
      officialResultsSaved: 'Saved! Bonus points updated for all users.',
    },
    dashboard: {
      welcome: 'Welcome back',
      myPools: 'My Pools',
      poolsImIn: "Pools I'm In",
      noPools: "You haven't joined any pools yet.",
      noOwned: "You haven't created any pools yet.",
      noJoined: "You haven't joined any pools yet.",
      createFirst: 'Create your first pool',
      joinExisting: 'or join an existing one with an invite code.',
      createPool: 'Create Pool',
      joinPool: 'Join with Code',
      manage: 'Manage →',
      view: 'View Pool →',
      makePredictions: 'Make Predictions',
      members: 'members',
      approvedMembers: 'approved members',
      pendingReqs: 'pending requests',
      points: 'points',
      pts: 'pts',
      code: 'Code:',
      badgePending: 'Pending',
      badgeApproved: 'Approved',
      badgeRejected: 'Rejected',
      awaitApproval: 'Awaiting admin approval.',
      yourScore: 'your score',
      archivePool: 'Archive',
      archiveConfirm: 'Archive this pool? It will be hidden from your dashboard but all data will be preserved.',
      poolsImInSubtitle: 'These are the pools you have joined. Click View Pool to start predicting!',
      noJoinedFriendly: "You haven't joined any pools yet. Ask a friend for an invite link or join with a code!",
      myPoolsSubtitle: 'These are the pools you have created.',
      wantOwnPool: 'Want to run your own pool?',
      viewAndPredict: 'View Pool → Start Predicting',
      rank: 'Rank',
      rankOf: 'of',
    },
    poolInfo: {
      back: '← Dashboard',
      memberBadge: 'Member',
      predict: '⚽ Predict',
      bonus: '⭐ Bonus',
      standings: '🏆 Standings',
      infoTitle: 'Pool Info',
      organizer: 'Organizer',
      inviteCode: 'Invite code',
      members: 'Members',
      noMembers: 'No members yet.',

      // ── Section titles ─────────────────────────────────────────
      sec1Title: 'How Predictions Work',
      sec2Title: 'Points System',
      sec3Title: 'Examples',
      sec4Title: 'Bonus Predictions',
      sec5Title: 'Prediction Deadlines',
      sec6Title: 'Tiebreakers',

      // ── Section 1 ─────────────────────────────────────────────
      sec1b1: 'Predict the final score of each match before the deadline.',
      sec1b2: 'Predictions cover 90 minutes of regulation + stoppage time + extra time.',
      sec1b3: 'Penalty shootouts are NOT included — only the score at full time / extra time.',
      sec1b4: 'Example: a match goes to penalties after 1–1. You predicted 1–1 → you get full points for a correct draw.',

      // ── Section 2 ─────────────────────────────────────────────
      groupLabel: 'Group Stage (×1)',
      knockoutLabel: 'Knockout Stages (×2)',
      maxPerMatch: 'Maximum per match',
      correctResult: 'Correct result (W / D / L)',
      correctHome: 'Correct home score',
      correctAway: 'Correct away score',
      correctDiff: 'Correct goal margin (how close — e.g. 1–2 vs 1–0 = same 1-goal margin)',
      pts: 'pts',

      // ── Section 3 examples ────────────────────────────────────
      ex1Title: 'Predict 2–0, result is 3–1',
      ex1r1: 'Correct result (home win)',
      ex1r2: 'Home goals — predicted 2, scored 3',
      ex1r3: 'Away goals — predicted 0, scored 1',
      ex1r4: 'Goal difference — 2 vs 2 ✓',
      ex2Title: 'Predict 1–1, result is 2–2',
      ex2r1: 'Correct result (draw)',
      ex2r2: 'Home goals — predicted 1, scored 2',
      ex2r3: 'Away goals — predicted 1, scored 2',
      ex2r4: 'Goal difference — 0 vs 0 ✓',
      ex3Title: 'Predict 2–1, result is 2–1 (perfect!)',
      ex3r1: 'Correct result',
      ex3r2: 'Home goals — exact',
      ex3r3: 'Away goals — exact',
      ex3r4: 'Goal difference',
      exGroupTotal: 'Group stage total',
      exKnockoutTotal: 'Knockout total',

      // ── Section 4 ─────────────────────────────────────────────
      bonusTitle: 'Bonus Predictions',
      bonusWinner: 'Tournament winner',
      bonusRunnerUp: 'Runner-up',
      bonusThird: 'Third place',
      bonusGoldenBall: 'Golden Ball (best player)',
      bonusGoldenBoot: 'Golden Boot (top scorer)',
      bonusGoldenGlove: 'Golden Glove (best goalkeeper)',
      bonusTotalPossible: 'Total possible bonus',
      bonusDeadline: '⚠ Bonus picks must be submitted before the Group Stage Matchday 1 deadline. Late submissions are not counted.',

      // ── Section 5 ─────────────────────────────────────────────
      sec5b1: 'Each round has a deadline shown as a countdown timer on the Predict tab.',
      sec5b2: 'Predictions are LOCKED once the deadline passes — no changes allowed.',
      sec5b3: 'If you join late, you get 0 points for locked rounds but can predict all future rounds.',

      // ── Section 6 ─────────────────────────────────────────────
      sec6intro: 'If two or more players have the same total points, the winner is determined by these criteria in order:',
      tb1: '1. Correct tournament winner prediction',
      tb2: '2. Most exact score predictions (e.g. predicted 2–1, result was 2–1)',
      tb3: '3. Most correct result predictions (W / D / L)',
      tb4: '4. Most correct individual goal predictions',
      tb5: '5. Most unique score predictions',
      sec6end: 'If still tied after all 5 criteria, players share the position.',

      groupCol: 'Group ×1',
      knockoutCol: 'Knockout ×2',
      rulesTitle: 'Rules',
      rulesHow: '',
      rulesExample: '',
      tiebreakers: 'Tiebreakers',

      // prizes
      prizeSectionTitle: 'Prize',
      first: '1st Place',
      second: '2nd Place',
      third: '3rd Place',
      pot: 'Total pot',
      perPerson: 'Entry fee',
      winnerTakesAll: 'Winner Takes All!',

      // completion table
      completionTitle: 'Prediction Status',
      completionSubtitle: 'Who has submitted their predictions',
      statusComplete: 'Submitted',
      statusMissing: 'Missing',
      statusOpen: 'Open',
      statusPending: 'Not yet',
    },
    poolWelcome: {
      title: 'Welcome to {name}! 🎉',
      subtitle: "Here's everything you need to know to get started",
      howWorksTitle: 'How This Pool Works',
      p1: 'The FIFA World Cup 2026 is divided into 8 stages. The first 3 are Group Stage matchdays, where every team plays 3 matches against teams in their group. After that, it\'s knockout football — Round of 32, Round of 16, Quarter-finals, Semi-finals, and the Final.',
      p2: 'Your job is simple: predict the score of each match before it kicks off.',
      p3a: 'You have until',
      p3bold: '1 HOUR BEFORE the first match of each stage',
      p3b: 'to lock in your predictions for that round. After that, no changes are allowed — so don\'t wait too long!',
      p4: "The good news? You DON'T need to predict everything at once. Focus on the current stage, then come back to predict the next one as the tournament progresses. You can even adjust future predictions based on how teams are performing.",
      p5: "One more thing: there's a Bonus section where you can predict the tournament winner, best player, top scorer, and more. These must be submitted alongside your first round of predictions — so don't miss it!",
      btn1Title: 'Make Predictions',
      btn1Sub: 'Predict match scores and earn points',
      btn2Title: 'Bonus Picks',
      btn2Sub: 'Predict the champion, Golden Ball, and more',
      btn3Title: 'Rules & Participants',
      btn3Sub: 'Full scoring rules, prizes, and who\'s playing',
      btn4Title: 'Standings',
      btn4Sub: "See who's leading the pool",
    },
    profile: {
      title: 'My Profile',
      personalInfo: 'Personal Information',
      fullName: 'Full Name',
      emailReadOnly: 'Email cannot be changed',
      language: 'Language',
      saveProfile: 'Save Changes',
      profileSaved: 'Profile updated!',
      changePassword: 'Change Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      savePassword: 'Update Password',
      passwordSaved: 'Password updated! Please log in again.',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 8 characters',
    },
  },
  es: {
    nav: {
      logo: 'GolPool',
      login: 'Iniciar Sesión',
      signup: 'Registrarse',
      dashboard: 'Panel',
      logout: 'Cerrar Sesión',
    },
    landing: {
      badge: 'Copa del Mundo 2026',
      title: 'Predice. Compite. Gana.',
      subtitle:
        'Únete a tus amigos en una polla del Mundial FIFA 2026. Gana puntos por cada resultado correcto y escala en la clasificación.',
      createPool: 'Crear una Polla',
      joinPool: 'Unirse a una Polla',
      feature1Title: 'Predicciones Fáciles',
      feature1Desc: 'Predice resultados de cada partido, desde la fase de grupos hasta la final.',
      feature2Title: 'Clasificación en Vivo',
      feature2Desc: 'Mira tu posición actualizarse en tiempo real cuando terminan los partidos.',
      feature3Title: 'Pollas Privadas',
      feature3Desc: 'Invita solo a tus amigos con un código privado de acceso.',
    },
    auth: {
      loginTitle: 'Bienvenido de nuevo',
      loginSubtitle: 'Inicia sesión en tu cuenta GolPool',
      signupTitle: 'Crea tu cuenta',
      signupSubtitle: 'Únete a GolPool y empieza a predecir',
      forgotTitle: 'Restablecer contraseña',
      forgotSubtitle: 'Ingresa tu correo y te enviaremos un código de verificación',
      resetTitle: 'Nueva contraseña',
      resetSubtitle: 'Elige una contraseña segura',
      fullName: 'Nombre completo',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      language: 'Idioma',
      loginButton: 'Iniciar Sesión',
      signupButton: 'Crear Cuenta',
      sendResetLink: 'Enviar Enlace',
      resetButton: 'Guardar Contraseña',
      noAccount: '¿No tienes cuenta?',
      haveAccount: '¿Ya tienes cuenta?',
      forgotPassword: '¿Olvidaste tu contraseña?',
      backToLogin: 'Volver al inicio de sesión',
      checkEmail: 'Enviamos un código de verificación de 6 dígitos a {email}. Ingrésalo en la siguiente página para restablecer tu contraseña.',
      checkEmailTitle: 'Revisa tu correo ✓',
      enterCode: 'Ingresar Código →',
      passwordMismatch: 'Las contraseñas no coinciden.',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
      otpTitle: 'Revisa tu correo',
      otpSubtitle: 'Enviamos un código de verificación a',
      otpCodeLabel: 'Código de verificación',
      otpVerify: 'Verificar',
      otpNoCode: '¿No lo recibiste?',
      otpResend: 'Reenviar código',
      otpResent: '¡Código reenviado! Revisa tu bandeja de entrada.',
      otpInvalid: 'Código inválido o expirado. Por favor intenta de nuevo.',
    },
    predict: {
      title: 'Predicciones',
      save: 'Guardar Predicciones',
      saving: 'Guardando…',
      saved: '¡Guardado!',
      deadlineLabel: 'Cierra en:',
      closed: 'Predicciones cerradas',
      noMatches: 'Aún no hay partidos para esta jornada.',
      group: 'Grupo',
      edit: 'Editar',
      cancel: 'Cancelar',
      back: '← Panel',
      incompleteError: 'Por favor ingresa los marcadores de todos los partidos antes de guardar.',
      pts: 'pts',
      officialResult: 'Resultado Oficial',
      yourPrediction: 'Tu Predicción',
      noPrediction: 'Sin predicción',
      pointsEarned: 'Puntos ganados',
      roundPoints: 'Puntos de la jornada',
      matchesFinished: 'partidos finalizados',
      viewingPlayer: 'Viendo',
      myPredictions: 'Mis Predicciones',
      selectPlayer: 'Ver otro jugador…',
      deadlineNotPassed: 'Disponible después del cierre',
      statusFinished: 'Finalizado',
      statusLive: 'En vivo',
      statusUpcoming: 'Próximo',
      correctResult: 'Resultado correcto',
      correctHome: 'Goles local',
      correctAway: 'Goles visitante',
      correctDiff: 'Diferencia de goles',
      searchPlayer: 'Buscar jugador…',
      notPredicted: 'Sin predicción aún',
      missingMatches: 'Tienes {n} partidos sin predicción. Los partidos sin predicción no ganarán puntos. ¿Continuar guardando?',
      saveAnyway: 'Guardar de todas formas',
      goBack: 'Volver',
      savedCount: '¡{n} predicciones guardadas!',
      cancelConfirmMsg: 'Tienes {n} predicciones sin guardar. ¿Seguro que quieres cancelar? Tus cambios se perderán.',
      yesDiscard: 'Sí, descartar cambios',
      keepEditing: 'Seguir editando',
      deadlineAt: '· Fecha límite:',
      tbdMessage: 'Las predicciones se activarán cuando se confirmen los equipos',
      exportBtn: '📥 Exportar Predicciones',
      exportPending: 'Pendiente',
      exportNoPickD: 'Sin predicción',
      allSavedAdvancing: '¡Predicciones guardadas! Yendo a la siguiente jornada...',
    },
    leaderboard: {
      title: 'Clasificación',
      player: 'Jugador',
      total: 'Pts',
      noMembers: 'Sin miembros aprobados aún.',
      back: '← Panel',
      bonus: 'Bonus',
      roundTotals: 'Totales por Ronda',
      searchPlayer: 'Buscar jugador...',
      showing: 'Mostrando {n} de {total} jugadores',
      you: 'Tú',
      roundAverages: 'Promedio por Jornada',
    },
    bonus: {
      title: 'Predicciones Bonus',
      subtitle: 'Enviar antes del cierre de la Jornada 1 de Grupos',
      winner: 'Campeón del Torneo',
      runnerUp: 'Subcampeón',
      third: 'Tercer Lugar',
      goldenBall: 'Balón de Oro – Mejor Jugador',
      goldenBoot: 'Bota de Oro – Máximo Goleador',
      goldenGlove: 'Guante de Oro – Mejor Portero',
      save: 'Guardar Predicciones Bonus',
      saving: 'Guardando…',
      saved: '✓ ¡Guardado!',
      locked: 'Las predicciones bonus ya están cerradas',
      placeholder: 'Buscar…',
      back: '← Panel',
      edit: 'Editar',
      cancel: 'Cancelar',
      noAnswer: '—',
      incompleteError: 'Por favor completa todas las predicciones bonus antes de guardar.',
      totalPoints: 'Puntos bonus',
      viewingPlayer: 'Viendo',
      myPredictions: 'Mis Picks Bonus',
      searchHint: 'Escribe para buscar',
      closesIn: 'Los picks bonus cierran en:',
      deadlineAt: '· Fecha límite:',
      searchPlayer: 'Buscar jugador…',
    },
    tabs: {
      home: 'Inicio',
      predict: 'Predicciones',
      bonus: 'Bonus',
      standings: 'Clasificación',
      summary: 'Estadísticas',
      poolInfo: 'Info',
      manage: 'Gestionar →',
    },
    summary: {
      title: 'Estadísticas del Partido',
      selectRound: 'Jornada',
      selectMatch: 'Partido',
      totalPredictions: 'predicciones totales',
      validScores: 'marcadores válidos',
      didNotPredict: 'no predijeron',
      outcomeSummary: 'Resumen de Resultados',
      mostPopular: 'Marcadores Más Populares',
      mostPopularBadge: 'MÁS POPULAR',
      homeWin: 'Gana {team}',
      draw: 'Empate',
      awayWin: 'Gana {team}',
      predictions: 'predicciones',
      didNotSubmit: '{n} participantes no enviaron predicción',
      locked: '🔒 Las predicciones de este partido están ocultas hasta que pase la fecha límite',
      pointsEarned: 'Puntos Ganados',
      pointsAverage: 'Promedio',
      pointsMedian: 'Mediana',
      pointsTop: 'Máximo',
      yourPoints: 'Tus Puntos',
      noPrediction: 'Sin predicción',
      yourPrediction: 'TU PREDICCIÓN',
    },
    createPool: {
      title: 'Crear una Polla',
      backDashboard: 'Volver al panel',
      back: 'Atrás',
      next: 'Siguiente',
      createPool: 'Crear Polla',
      creating: 'Creando…',
      genericError: 'Algo salió mal',

      step1Label: 'Datos Básicos',
      nameLabel: 'Nombre de la polla',
      namePlaceholder: 'Ej. Oficina Campeones 2026',
      descLabel: 'Descripción',
      descPlaceholder: 'Una descripción breve de tu polla…',
      currencyLabel: 'Moneda',
      currencyForPrizesLabel: 'Moneda del premio',
      optional: 'opcional',
      nameRequired: 'El nombre de la polla es obligatorio.',

      joinModeQuestion: '¿Cómo deben unirse los miembros?',
      joinModeApproval: 'Requiere aprobación del admin',
      joinModeApprovalDesc: 'Tú revisas y apruebas cada solicitud',
      joinModeOpen: 'Cualquiera con el enlace puede unirse',
      joinModeOpenDesc: 'Cualquiera con el enlace de invitación se une al instante',

      step2Label: 'Premio',
      hasPrizeQuestion: '¿Esta polla tendrá un premio?',
      yesPrize: 'Sí, hay un premio',
      yesPrizeDesc: 'Define montos fijos o divide las cuotas de participación.',
      noPrize: 'Sin premio',
      noPrizeDesc: 'Solo por diversión — sin dinero de por medio.',
      prizeChoiceRequired: 'Por favor elige si la polla tiene premio.',
      prizeTypeQuestion: '¿Cómo quieres configurar el premio?',
      fixedPrize: 'Premios fijos',
      fixedPrizeDesc: 'Defino los montos exactos para cada posición.',
      perEntry: 'Cuota de entrada — dividir el bote',
      perEntryDesc: 'Todos pagan para entrar y dividimos el bote.',
      prizeTypeRequired: 'Por favor selecciona el tipo de premio.',

      step3aLabel: 'Montos de Premio',
      fixedDesc: 'Establece el premio para cada posición. Solo el 1er lugar es obligatorio.',
      first: '1er Lugar',
      second: '2do Lugar',
      third: '3er Lugar',
      prize1stRequired: 'El monto del 1er lugar es obligatorio.',
      prizePoolPreview: 'Bote total',
      total: 'total',

      step3bLabel: 'Cuota y Distribución',
      entryFeeLabel: 'Cuota por persona',
      entryFeeRequired: 'La cuota de entrada es obligatoria.',
      distLabel: 'Distribución del premio',
      pctRequired: 'El porcentaje del 1er lugar es obligatorio.',
      pctMustBe100: 'Los porcentajes deben sumar 100% (actualmente {n}%).',
      winnerTakesAll: '¡El ganador se lleva todo!',
      exampleWith10: 'Ejemplo con 10 jugadores',
      pot: 'Bote total',
      perPerson: 'Cuota de entrada',

      step4Label: 'Revisar y Crear',
    },
    admin: {
      removeButton: 'Eliminar',
      removeConfirm: 'Eliminar a {name} de esta polla? Sus predicciones también serán eliminadas.',
      archivePool: 'Archivar Polla',
      archiveConfirm: '¿Archivar esta polla? Se ocultará de tu panel pero todos los datos se conservarán.',
      archiveSuccess: 'Polla archivada',
      archiving: 'Archivando…',
      exportMembers: 'Exportar Miembros',
      exportFilename: 'Miembros',
      openPool: 'Polla abierta',
      approvalRequired: 'Requiere aprobación',
      removedMembers: 'Miembros eliminados',
      restore: 'Restaurar',
      officialBonusResults: '🏆 Resultados Bonus Oficiales',
      saveOfficialResults: 'Guardar y Calcular Puntos',
      officialResultsSaved: '¡Guardado! Puntos bonus actualizados para todos.',
    },
    dashboard: {
      welcome: 'Bienvenido de nuevo',
      myPools: 'Mis Pollas',
      poolsImIn: 'Pollas en las que estoy',
      noPools: 'Aún no te has unido a ninguna polla.',
      noOwned: 'Aún no has creado ninguna polla.',
      noJoined: 'Aún no te has unido a ninguna polla.',
      createFirst: 'Crea tu primera polla',
      joinExisting: 'o únete a una existente con un código de invitación.',
      createPool: 'Crear Polla',
      joinPool: 'Unirse con Código',
      manage: 'Administrar →',
      view: 'Ver →',
      makePredictions: 'Hacer Predicciones',
      members: 'miembros',
      approvedMembers: 'miembros aprobados',
      pendingReqs: 'solicitudes pendientes',
      points: 'puntos',
      pts: 'pts',
      code: 'Código:',
      badgePending: 'Pendiente',
      badgeApproved: 'Aprobado',
      badgeRejected: 'Rechazado',
      awaitApproval: 'Esperando aprobación del admin.',
      yourScore: 'tu puntaje',
      archivePool: 'Archivar',
      archiveConfirm: '¿Archivar esta polla? Se ocultará de tu panel pero todos los datos se conservarán.',
      poolsImInSubtitle: 'Estas son las pollas a las que te has unido. ¡Haz clic en Ver Polla para empezar a predecir!',
      noJoinedFriendly: 'Aún no te has unido a ninguna polla. ¡Pídele a un amigo un enlace de invitación o únete con un código!',
      myPoolsSubtitle: 'Estas son las pollas que has creado.',
      wantOwnPool: '¿Quieres crear tu propia polla?',
      viewAndPredict: 'Ver Polla → Empezar a Predecir',
      rank: 'Posición',
      rankOf: 'de',
    },
    poolInfo: {
      back: '← Panel',
      memberBadge: 'Miembro',
      predict: '⚽ Predecir',
      bonus: '⭐ Bonus',
      standings: '🏆 Clasificación',
      infoTitle: 'Info de la Polla',
      organizer: 'Organizador',
      inviteCode: 'Código de invitación',
      members: 'Miembros',
      noMembers: 'Sin miembros aún.',

      // ── Títulos de sección ─────────────────────────────────────
      sec1Title: 'Cómo funcionan las predicciones',
      sec2Title: 'Sistema de puntos',
      sec3Title: 'Ejemplos',
      sec4Title: 'Predicciones Bonus',
      sec5Title: 'Plazos de predicción',
      sec6Title: 'Desempate',

      // ── Sección 1 ─────────────────────────────────────────────
      sec1b1: 'Predice el marcador final de cada partido antes del plazo.',
      sec1b2: 'Las predicciones cubren 90 minutos de tiempo reglamentario + tiempo de descuento + tiempo extra.',
      sec1b3: 'Los penales NO están incluidos — solo el marcador al final del tiempo reglamentario / extra.',
      sec1b4: 'Ejemplo: un partido va a penales tras el 1–1. Predijiste 1–1 → obtienes puntos completos por empate correcto.',

      // ── Sección 2 ─────────────────────────────────────────────
      groupLabel: 'Fase de grupos (×1)',
      knockoutLabel: 'Eliminatoria (×2)',
      maxPerMatch: 'Máximo por partido',
      correctResult: 'Resultado correcto (G / E / P)',
      correctHome: 'Goles local correctos',
      correctAway: 'Goles visitante correctos',
      correctDiff: 'Margen de goles correcto (distancia — ej. 1–2 vs 1–0 = mismo margen de 1 gol)',
      pts: 'pts',

      // ── Sección 3 ejemplos ────────────────────────────────────
      ex1Title: 'Predices 2–0, resultado 3–1',
      ex1r1: 'Resultado correcto (victoria local)',
      ex1r2: 'Goles local — predijiste 2, marcaron 3',
      ex1r3: 'Goles visitante — predijiste 0, marcaron 1',
      ex1r4: 'Diferencia de goles — 2 vs 2 ✓',
      ex2Title: 'Predices 1–1, resultado 2–2',
      ex2r1: 'Resultado correcto (empate)',
      ex2r2: 'Goles local — predijiste 1, marcaron 2',
      ex2r3: 'Goles visitante — predijiste 1, marcaron 2',
      ex2r4: 'Diferencia de goles — 0 vs 0 ✓',
      ex3Title: 'Predices 2–1, resultado 2–1 (¡perfecto!)',
      ex3r1: 'Resultado correcto',
      ex3r2: 'Goles local — exacto',
      ex3r3: 'Goles visitante — exacto',
      ex3r4: 'Diferencia de goles',
      exGroupTotal: 'Total fase grupos',
      exKnockoutTotal: 'Total eliminatoria',

      // ── Sección 4 ─────────────────────────────────────────────
      bonusTitle: 'Predicciones Bonus',
      bonusWinner: 'Campeón del torneo',
      bonusRunnerUp: 'Subcampeón',
      bonusThird: 'Tercer lugar',
      bonusGoldenBall: 'Balón de Oro (mejor jugador)',
      bonusGoldenBoot: 'Bota de Oro (máximo goleador)',
      bonusGoldenGlove: 'Guante de Oro (mejor portero)',
      bonusTotalPossible: 'Total posible bonus',
      bonusDeadline: '⚠ Las predicciones bonus deben enviarse antes del cierre de la Jornada 1 de Grupos. Las enviadas tarde no cuentan.',

      // ── Sección 5 ─────────────────────────────────────────────
      sec5b1: 'Cada jornada tiene un plazo que se muestra como cuenta regresiva en la pestaña Predicciones.',
      sec5b2: 'Las predicciones quedan BLOQUEADAS una vez vence el plazo — no se permiten cambios.',
      sec5b3: 'Si te unes tarde, obtienes 0 puntos en las jornadas bloqueadas pero puedes predecir las siguientes.',

      // ── Sección 6 ─────────────────────────────────────────────
      sec6intro: 'Si dos o más jugadores tienen el mismo total de puntos, el ganador se determina en orden por:',
      tb1: '1. Predicción correcta del campeón del torneo',
      tb2: '2. Más marcadores exactos (ej. predijiste 2–1, resultado 2–1)',
      tb3: '3. Más resultados correctos (G / E / P)',
      tb4: '4. Más goles individuales correctos',
      tb5: '5. Más predicciones de marcadores únicos',
      sec6end: 'Si aún hay empate tras los 5 criterios, los jugadores comparten la posición.',

      groupCol: 'Grupos ×1',
      knockoutCol: 'Eliminatoria ×2',
      rulesTitle: 'Reglas',
      rulesHow: '',
      rulesExample: '',
      tiebreakers: 'Desempate',

      // premios
      prizeSectionTitle: 'Premio',
      first: '1er Lugar',
      second: '2do Lugar',
      third: '3er Lugar',
      pot: 'Bote total',
      perPerson: 'Cuota de entrada',
      winnerTakesAll: '¡El ganador se lleva todo!',

      // tabla de estado de predicciones
      completionTitle: 'Estado de Predicciones',
      completionSubtitle: 'Quién ha enviado sus predicciones',
      statusComplete: 'Enviado',
      statusMissing: 'No enviado',
      statusOpen: 'Abierto',
      statusPending: 'Aún no',
    },
    poolWelcome: {
      title: '¡Bienvenido a {name}! 🎉',
      subtitle: 'Aquí todo lo que necesitas saber para empezar',
      howWorksTitle: 'Cómo funciona esta polla',
      p1: 'El Mundial FIFA 2026 está dividido en 8 etapas. Las primeras 3 son jornadas de la Fase de Grupos, donde cada equipo juega 3 partidos contra los equipos de su grupo. Después comienza el fútbol eliminatorio — Ronda de 32, Octavos de Final, Cuartos de Final, Semifinales y la Final.',
      p2: 'Tu trabajo es simple: predice el marcador de cada partido antes de que empiece.',
      p3a: 'Tienes hasta',
      p3bold: '1 HORA ANTES del primer partido de cada etapa',
      p3b: 'para confirmar tus predicciones de esa ronda. Después de eso, no se permiten cambios — ¡así que no esperes demasiado!',
      p4: '¿Las buenas noticias? NO necesitas predecir todo de una vez. Concéntrate en la etapa actual y vuelve después para predecir la siguiente a medida que avanza el torneo. Incluso puedes ajustar predicciones futuras según cómo están rindiendo los equipos.',
      p5: 'Una cosa más: hay una sección de Bonus donde puedes predecir el campeón del torneo, el mejor jugador, el máximo goleador y más. Debes enviarlos junto con tu primera ronda de predicciones — ¡no te lo pierdas!',
      btn1Title: 'Hacer Predicciones',
      btn1Sub: 'Predice marcadores y gana puntos',
      btn2Title: 'Picks Bonus',
      btn2Sub: 'Predice el campeón, Balón de Oro y más',
      btn3Title: 'Reglas y Participantes',
      btn3Sub: 'Reglas de puntuación, premios y quién juega',
      btn4Title: 'Clasificación',
      btn4Sub: 'Mira quién va liderando',
    },
    profile: {
      title: 'Mi Perfil',
      personalInfo: 'Información Personal',
      fullName: 'Nombre Completo',
      emailReadOnly: 'El correo no se puede cambiar',
      language: 'Idioma',
      saveProfile: 'Guardar Cambios',
      profileSaved: '¡Perfil actualizado!',
      changePassword: 'Cambiar Contraseña',
      newPassword: 'Nueva Contraseña',
      confirmPassword: 'Confirmar Nueva Contraseña',
      savePassword: 'Actualizar Contraseña',
      passwordSaved: '¡Contraseña actualizada! Por favor inicia sesión nuevamente.',
      passwordMismatch: 'Las contraseñas no coinciden',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
    },
  },
} as const

export type Lang = keyof typeof translations

export interface Translations {
  nav: { logo: string; login: string; signup: string; dashboard: string; logout: string }
  landing: {
    badge: string; title: string; subtitle: string
    createPool: string; joinPool: string
    feature1Title: string; feature1Desc: string
    feature2Title: string; feature2Desc: string
    feature3Title: string; feature3Desc: string
  }
  auth: {
    loginTitle: string; loginSubtitle: string
    signupTitle: string; signupSubtitle: string
    forgotTitle: string; forgotSubtitle: string
    resetTitle: string; resetSubtitle: string
    fullName: string; email: string; password: string; confirmPassword: string; language: string
    loginButton: string; signupButton: string; sendResetLink: string; resetButton: string
    noAccount: string; haveAccount: string; forgotPassword: string; backToLogin: string
    checkEmail: string; checkEmailTitle: string; enterCode: string
    passwordMismatch: string; passwordTooShort: string
    otpTitle: string; otpSubtitle: string; otpCodeLabel: string; otpVerify: string
    otpNoCode: string; otpResend: string; otpResent: string; otpInvalid: string
  }
  predict: {
    title: string; save: string; saving: string; saved: string
    deadlineLabel: string; closed: string; noMatches: string
    group: string; edit: string; cancel: string; back: string; incompleteError: string
    pts: string; officialResult: string; yourPrediction: string; noPrediction: string
    pointsEarned: string; roundPoints: string; matchesFinished: string
    viewingPlayer: string; myPredictions: string; selectPlayer: string; deadlineNotPassed: string
    statusFinished: string; statusLive: string; statusUpcoming: string
    correctResult: string; correctHome: string; correctAway: string; correctDiff: string
    searchPlayer: string; notPredicted: string; missingMatches: string; saveAnyway: string; goBack: string; savedCount: string
    cancelConfirmMsg: string; yesDiscard: string; keepEditing: string; deadlineAt: string; tbdMessage: string
    exportBtn: string; exportPending: string; exportNoPickD: string; allSavedAdvancing: string
  }
  leaderboard: {
    title: string; player: string; total: string; noMembers: string; back: string
    bonus: string; roundTotals: string
    searchPlayer: string; showing: string; you: string; roundAverages: string
  }
  bonus: {
    title: string; subtitle: string
    winner: string; runnerUp: string; third: string
    goldenBall: string; goldenBoot: string; goldenGlove: string
    save: string; saving: string; saved: string; locked: string; placeholder: string; back: string
    edit: string; cancel: string; noAnswer: string; incompleteError: string
    totalPoints: string; viewingPlayer: string; myPredictions: string; searchHint: string
    closesIn: string; deadlineAt: string; searchPlayer: string
  }
  tabs: {
    home: string; predict: string; bonus: string; standings: string; summary: string; poolInfo: string; manage: string
  }
  summary: {
    title: string; selectRound: string; selectMatch: string
    totalPredictions: string; validScores: string; didNotPredict: string
    outcomeSummary: string; mostPopular: string; mostPopularBadge: string
    homeWin: string; draw: string; awayWin: string; predictions: string
    didNotSubmit: string; locked: string
    pointsEarned: string; pointsAverage: string; pointsMedian: string; pointsTop: string
    yourPoints: string; noPrediction: string; yourPrediction: string
  }
  createPool: {
    title: string; backDashboard: string; back: string; next: string; createPool: string; creating: string; genericError: string
    step1Label: string; nameLabel: string; namePlaceholder: string; descLabel: string; descPlaceholder: string; currencyLabel: string; currencyForPrizesLabel: string; optional: string; nameRequired: string
    joinModeQuestion: string; joinModeApproval: string; joinModeApprovalDesc: string; joinModeOpen: string; joinModeOpenDesc: string
    step2Label: string; hasPrizeQuestion: string; yesPrize: string; yesPrizeDesc: string; noPrize: string; noPrizeDesc: string; prizeChoiceRequired: string
    prizeTypeQuestion: string; fixedPrize: string; fixedPrizeDesc: string; perEntry: string; perEntryDesc: string; prizeTypeRequired: string
    step3aLabel: string; fixedDesc: string; first: string; second: string; third: string; prize1stRequired: string; prizePoolPreview: string; total: string
    step3bLabel: string; entryFeeLabel: string; entryFeeRequired: string; distLabel: string; pctRequired: string; pctMustBe100: string
    winnerTakesAll: string; exampleWith10: string; pot: string; perPerson: string
    step4Label: string
  }
  admin: {
    removeButton: string; removeConfirm: string
    archivePool: string; archiveConfirm: string; archiveSuccess: string; archiving: string
    exportMembers: string; exportFilename: string
    openPool: string; approvalRequired: string
    removedMembers: string; restore: string
    officialBonusResults: string; saveOfficialResults: string; officialResultsSaved: string
  }
  dashboard: {
    welcome: string; myPools: string; poolsImIn: string
    noPools: string; noOwned: string; noJoined: string
    createFirst: string; joinExisting: string
    createPool: string; joinPool: string
    manage: string; view: string; makePredictions: string
    members: string; approvedMembers: string; pendingReqs: string
    points: string; pts: string; code: string
    badgePending: string; badgeApproved: string; badgeRejected: string
    awaitApproval: string; yourScore: string
    archivePool: string; archiveConfirm: string
    poolsImInSubtitle: string; noJoinedFriendly: string
    myPoolsSubtitle: string; wantOwnPool: string; viewAndPredict: string
    rank: string; rankOf: string
  }
  poolInfo: {
    back: string; memberBadge: string
    predict: string; bonus: string; standings: string
    infoTitle: string; organizer: string; inviteCode: string
    members: string; noMembers: string
    // section titles
    sec1Title: string; sec2Title: string; sec3Title: string
    sec4Title: string; sec5Title: string; sec6Title: string
    // section 1
    sec1b1: string; sec1b2: string; sec1b3: string; sec1b4: string
    // section 2
    groupLabel: string; knockoutLabel: string; maxPerMatch: string
    correctResult: string; correctHome: string; correctAway: string; correctDiff: string; pts: string
    // section 3
    ex1Title: string; ex1r1: string; ex1r2: string; ex1r3: string; ex1r4: string
    ex2Title: string; ex2r1: string; ex2r2: string; ex2r3: string; ex2r4: string
    ex3Title: string; ex3r1: string; ex3r2: string; ex3r3: string; ex3r4: string
    exGroupTotal: string; exKnockoutTotal: string
    // section 4
    bonusTitle: string; bonusWinner: string; bonusRunnerUp: string; bonusThird: string
    bonusGoldenBall: string; bonusGoldenBoot: string; bonusGoldenGlove: string
    bonusTotalPossible: string; bonusDeadline: string
    // section 5
    sec5b1: string; sec5b2: string; sec5b3: string
    // section 6
    sec6intro: string; tb1: string; tb2: string; tb3: string; tb4: string; tb5: string; sec6end: string
    // legacy (kept for compat, unused by new layout)
    groupCol: string; knockoutCol: string; rulesTitle: string; rulesHow: string; rulesExample: string; tiebreakers: string
    // prizes
    prizeSectionTitle: string; first: string; second: string; third: string
    pot: string; perPerson: string; winnerTakesAll: string
    // completion table
    completionTitle: string; completionSubtitle: string
    statusComplete: string; statusMissing: string; statusOpen: string; statusPending: string
  }
  poolWelcome: {
    title: string; subtitle: string; howWorksTitle: string
    p1: string; p2: string; p3a: string; p3bold: string; p3b: string; p4: string; p5: string
    btn1Title: string; btn1Sub: string
    btn2Title: string; btn2Sub: string
    btn3Title: string; btn3Sub: string
    btn4Title: string; btn4Sub: string
  }
  profile: {
    title: string; personalInfo: string; fullName: string; emailReadOnly: string; language: string
    saveProfile: string; profileSaved: string
    changePassword: string; newPassword: string; confirmPassword: string
    savePassword: string; passwordSaved: string; passwordMismatch: string; passwordTooShort: string
  }
}
