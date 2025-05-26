<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User; // Adjust this to match your User model namespace

class UserSeeder extends Seeder
{
    public function run()
    {
        // Create an admin user
        User::create([
            'name' => 'Michael Schneider',
            'email' => 'mikitatek@gmail.com', // Change this to your desired email
            'password' => bcrypt('13579@Password'), // Change this to your desired password
        ]);
        // Create an admin user
        User::create([
            'name' => 'Alexandra Coca',
            'email' => 'calexc1705@gmail.com', // Change this to your desired email
            'password' => bcrypt('13579@Password'), // Change this to your desired password
        ]);
    }
}
