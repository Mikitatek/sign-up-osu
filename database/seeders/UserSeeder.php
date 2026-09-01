<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Seed admin users.
     *
     * Credentials come from the environment so no secrets live in the repo.
     * For local development the defaults below are fine; in production set
     * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env before seeding.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => env('SEED_ADMIN_EMAIL', 'admin@example.com')],
            [
                'name' => env('SEED_ADMIN_NAME', 'Admin'),
                'password' => bcrypt(env('SEED_ADMIN_PASSWORD', 'password')),
                'email_verified_at' => now(),
                'is_admin' => true,
            ]
        );
    }
}
