<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_limited_edition')->default(false)->after('is_active');
        });

        // Existing seasonal rows already carry the "Ediție limitată" category.
        DB::table('products')
            ->whereIn('category', ['Ediție limitată', 'Editie limitata', 'EDIȚIE LIMITATĂ'])
            ->update(['is_limited_edition' => true]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('is_limited_edition');
        });
    }
};
