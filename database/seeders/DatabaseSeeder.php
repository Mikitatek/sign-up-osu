<?php

namespace Database\Seeders;

use App\Models\NewsletterSignup;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(UserSeeder::class);
        $this->call(ProductSeeder::class);

        // Realistic demo data for local development only.
        if (app()->environment('local')) {
            NewsletterSignup::factory()->count(25)->create();
        }
    }
}
