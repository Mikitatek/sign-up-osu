<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Sellers see only the orders page. Nobody types their password: the new
 * account gets an email with a link to set it.
 */
class ManageSeller extends Command
{
    protected $signature = 'users:seller
        {email : The seller\'s email address}
        {name? : Their name, needed only for a new account}
        {--remove : Take the seller access away instead}';

    protected $description = 'Give an account seller access (orders only) and email it a link to set its password';

    public function handle(): int
    {
        $email = Str::lower(trim($this->argument('email')));
        if (Validator::make(['email' => $email], ['email' => 'required|email'])->fails()) {
            $this->error("Adresa {$email} nu e validă.");

            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();

        if ($this->option('remove')) {
            return $this->remove($user, $email);
        }

        if ($user?->is_admin) {
            $this->error("{$email} e admin și are deja acces la comenzi.");

            return self::FAILURE;
        }

        if (! $user) {
            $name = trim((string) $this->argument('name'));
            if ($name === '') {
                $this->error('Pentru un cont nou dă și numele: php artisan users:seller email@exemplu.ro "Nume Prenume"');

                return self::FAILURE;
            }

            $user = new User;
            $user->forceFill([
                'name' => $name,
                'email' => $email,
                'password' => Str::password(40), // replaced through the emailed link; nobody knows this one
                'email_verified_at' => now(),
            ]);
        }

        $user->forceFill(['is_seller' => true])->save();

        $status = Password::sendResetLink(['email' => $email]);
        if ($status !== Password::RESET_LINK_SENT) {
            $this->warn("Contul e vânzător, dar emailul cu linkul n-a plecat ({$status}). Poate cere altul din pagina de login, la „Forgot your password?”.");

            return self::SUCCESS;
        }

        $this->info("{$email} e vânzător. A primit pe email un link pentru setarea parolei (valabil 60 de minute).");

        return self::SUCCESS;
    }

    private function remove(?User $user, string $email): int
    {
        if (! $user?->is_seller) {
            $this->error("{$email} nu e vânzător.");

            return self::FAILURE;
        }

        $user->forceFill(['is_seller' => false])->save();
        $this->info("{$email} nu mai are acces la comenzi.");

        return self::SUCCESS;
    }
}
