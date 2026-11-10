<h1>Setează-ți parola</h1>

<p>Bună, {{ $name }}!</p>

<p>Ai primit acest email pentru că s-a cerut setarea parolei contului tău de pe batranul-osu.ro.</p>

<p>
    <a href="{{ $url }}" style="display:inline-block;padding:12px 20px;background:#065f46;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
        Setează parola
    </a>
</p>

<p>Dacă butonul nu merge, deschide linkul: <a href="{{ $url }}">{{ $url }}</a></p>

<p>
    Linkul expiră în {{ $minutes }} de minute. După aceea poți cere altul din pagina de login,
    la „Forgot your password?”.
</p>

<p>Dacă nu ai cerut tu asta, ignoră emailul; parola rămâne neschimbată.</p>

<p>Echipa Bătrânul Osu</p>
