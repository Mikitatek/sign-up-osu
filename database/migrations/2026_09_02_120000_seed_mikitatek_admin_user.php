<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Upsert the personal admin account for mikitatek@gmail.com.
     *
     * The password is stored only as a pre-computed bcrypt hash so the
     * plaintext never enters version control. Safe to re-run.
     */
    public function up(): void
    {
        $now = now();
        $hash = '$2y$12$Z4PclZteGj0FYJJjVdtqY.eq6VCh9spjYNVvmfstNuqDCEjEOjlX.';

        $exists = DB::table('users')->where('email', 'mikitatek@gmail.com')->exists();

        if ($exists) {
            DB::table('users')->where('email', 'mikitatek@gmail.com')->update([
                'password' => $hash,
                'is_admin' => true,
                'email_verified_at' => $now,
                'updated_at' => $now,
            ]);

            return;
        }

        DB::table('users')->insert([
            'name' => 'Mikitatek',
            'email' => 'mikitatek@gmail.com',
            'password' => $hash,
            'email_verified_at' => $now,
            'is_admin' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'mikitatek@gmail.com')->delete();
    }
};
