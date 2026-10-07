(() => {
  const loading = document.getElementById("loading");
  const formBox = document.getElementById("formBox");
  const successBox = document.getElementById("successBox");
  const status = document.getElementById("status");
  const form = document.getElementById("passwordForm");
  const password = document.getElementById("password");
  const passwordConfirm = document.getElementById("passwordConfirm");
  const submitBtn = document.getElementById("submitBtn");

  function showError(message) {
    status.className = "status error";
    status.textContent = message;
  }

  function showOk(message) {
    status.className = "status ok";
    status.textContent = message;
  }

  async function start() {
    try {
      const cfg = window.TSC_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabasePublishableKey) {
        throw new Error("Configurazione TSC non disponibile.");
      }

      const client = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.supabasePublishableKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

      const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(location.search);

      const authError =
        hash.get("error_description") ||
        query.get("error_description");

      if (authError) {
        throw new Error(authError.replaceAll("+", " "));
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) {
        throw new Error(
          "Invito non valido o scaduto. Chiedi all'amministratore TSC di inviare un nuovo invito."
        );
      }

      const sessionResult = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionResult.error || !sessionResult.data.session) {
        throw sessionResult.error || new Error("Sessione di invito non valida.");
      }

      history.replaceState(null, "", location.pathname);

      loading.classList.add("hidden");
      formBox.classList.remove("hidden");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.className = "status";
        status.textContent = "";

        if (password.value.length < 8) {
          showError("La password deve contenere almeno 8 caratteri.");
          return;
        }

        if (password.value !== passwordConfirm.value) {
          showError("Le due password non coincidono.");
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Attivazione…";

        const { error } = await client.auth.updateUser({
          password: password.value,
        });

        if (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Attiva account";
          showError(error.message || "Impossibile impostare la password.");
          return;
        }

        await client.auth.signOut({ scope: "local" });

        formBox.classList.add("hidden");
        successBox.classList.remove("hidden");
        showOk("Attivazione completata.");
      });
    } catch (error) {
      loading.classList.add("hidden");
      showError(error?.message || "Impossibile verificare l'invito.");
    }
  }

  start();
})();
