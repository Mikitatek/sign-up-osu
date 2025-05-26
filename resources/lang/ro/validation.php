<?php

return [

    'accepted'             => 'Câmpul ":attribute" trebuie să fie acceptat.',
    'active_url'           => 'Câmpul ":attribute" nu este un URL valid.',
    'after'                => 'Câmpul ":attribute" trebuie să fie o dată după :date.',
    'alpha'                => 'Câmpul ":attribute" poate conține doar litere.',
    'alpha_dash'           => 'Câmpul ":attribute" poate conține doar litere, numere, și liniuțe.',
    'alpha_num'            => 'Câmpul ":attribute" poate conține doar litere și numere.',
    'array'                => 'Câmpul ":attribute" trebuie să fie un array.',
    'before'               => 'Câmpul ":attribute" trebuie să fie o dată înainte de :date.',
    'between'              => [
        'numeric' => 'Câmpul ":attribute" trebuie să fie între :min și :max.',
        'file'    => 'Fișierul ":attribute" trebuie să aibă între :min și :max kilobytes.',
        'string'  => 'Câmpul ":attribute" trebuie să aibă între :min și :max caractere.',
        'array'   => 'Câmpul ":attribute" trebuie să aibă între :min și :max elemente.',
    ],
    'boolean'              => 'Câmpul ":attribute" trebuie să fie adevărat sau fals.',
    'confirmed'            => 'Confirmarea câmpului ":attribute" nu se potrivește.',
    'date'                 => 'Câmpul ":attribute" nu este o dată validă.',
    'email'                => 'Câmpul ":attribute" trebuie să fie o adresă de email validă.',
    'required'             => 'Câmpul ":attribute" este obligatoriu.',
    'unique'               => 'Acest ":attribute" a fost deja utilizat.',

    // Add other validation rules as needed...

    // Custom attribute names
    'attributes' => [
        'email' => 'Email',
        'name'  => 'Nume',
        'phone' => 'Telefon',
        'gdpr' => 'GDPR',
        'newsletter_agreement' => 'Newsletter'
    ],

];
