import LegalPage from "@/Components/LegalPage";

export default function Cookies() {
    const openSettings = () =>
        window.dispatchEvent(new Event("osu:open-cookie-settings"));

    return (
        <LegalPage title="Politica de cookies" updated="2 septembrie 2026">
            <p>
                Site-ul <a href="https://batranul-osu.ro">batranul-osu.ro</a>,
                administrat de <strong>SC KAMANI S.R.L.</strong> (CUI 50260074,
                J8/1949/2024), folosește cookie-uri și tehnologii similare.
                Această politică explică ce sunt, ce tipuri folosim și cum îți
                poți gestiona alegerile.
            </p>

            <h2>1. Ce este un cookie</h2>
            <p>
                Un cookie este un fișier text de mici dimensiuni stocat de
                browser pe dispozitivul tău atunci când vizitezi un site. El
                permite site-ului să rețină acțiuni și preferințe (de ex.
                conținutul coșului, sesiunea de autentificare) pe o anumită
                perioadă.
            </p>

            <h2>2. Cookie-uri strict necesare</h2>
            <p>
                Sunt indispensabile pentru funcționarea site-ului și nu pot fi
                dezactivate. Se instalează fără a fi nevoie de consimțământ.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Cookie</th>
                        <th>Furnizor</th>
                        <th>Scop</th>
                        <th>Durată</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Cookie de sesiune</td>
                        <td>batranul-osu.ro</td>
                        <td>
                            Menține sesiunea vizitatorului și coșul de
                            cumpărături
                        </td>
                        <td>La închiderea sesiunii / 2 ore</td>
                    </tr>
                    <tr>
                        <td>XSRF-TOKEN</td>
                        <td>batranul-osu.ro</td>
                        <td>Protecție împotriva atacurilor CSRF</td>
                        <td>2 ore</td>
                    </tr>
                    <tr>
                        <td>osu_cookie_consent</td>
                        <td>batranul-osu.ro</td>
                        <td>Reține opțiunile tale privind cookie-urile</td>
                        <td>6 luni</td>
                    </tr>
                </tbody>
            </table>

            <h2>3. Cookie-uri de statistică (opționale)</h2>
            <p>
                Se instalează <strong>doar cu acordul tău</strong> și ne ajută
                să înțelegem cum este folosit site-ul, în formă agregată.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Cookie</th>
                        <th>Furnizor</th>
                        <th>Scop</th>
                        <th>Durată</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>_ga, _ga_*</td>
                        <td>Google Analytics (prin Google Tag Manager)</td>
                        <td>
                            Statistici de trafic și de utilizare a site-ului
                        </td>
                        <td>până la 2 ani</td>
                    </tr>
                </tbody>
            </table>

            <h2>4. Cookie-uri de marketing (opționale)</h2>
            <p>
                Se instalează <strong>doar cu acordul tău</strong> și sunt
                folosite pentru măsurarea și optimizarea campaniilor publicitare.
            </p>
            <table>
                <thead>
                    <tr>
                        <th>Cookie</th>
                        <th>Furnizor</th>
                        <th>Scop</th>
                        <th>Durată</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>_ttp, _tt_enable_cookie și similare</td>
                        <td>TikTok Pixel</td>
                        <td>
                            Măsurarea conversiilor și afișarea de reclame
                            relevante
                        </td>
                        <td>până la 13 luni</td>
                    </tr>
                </tbody>
            </table>

            <h2>5. Google Consent Mode</h2>
            <p>
                Etichetele Google se încarcă în modul &bdquo;consimțământ
                refuzat&rdquo; în mod implicit. Ele primesc permisiunea de a
                folosi cookie-uri numai după ce accepți categoria corespunzătoare
                din bannerul de cookie-uri.
            </p>

            <h2>6. Cum îți gestionezi preferințele</h2>
            <ul>
                <li>
                    Folosește butonul de mai jos sau linkul{" "}
                    <strong>&bdquo;Setări cookies&rdquo;</strong> din subsolul
                    site-ului pentru a-ți schimba alegerile oricând.
                </li>
                <li>
                    Poți șterge sau bloca cookie-urile și din setările
                    browserului. Blocarea celor strict necesare poate afecta
                    funcționarea site-ului.
                </li>
            </ul>
            <p>
                <button
                    type="button"
                    onClick={openSettings}
                    className="rounded-md bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                >
                    Deschide setările de cookies
                </button>
            </p>

            <h2>7. Modificări</h2>
            <p>
                Această politică poate fi actualizată periodic. Data ultimei
                actualizări este indicată în partea de sus a paginii.
            </p>
        </LegalPage>
    );
}
