<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Free-text portion size shown in the shop, e.g. "200 g", "330 ml".
            $table->string('gramaj', 50)->nullable()->after('description');
            // Where the row came from (e.g. "wolt") and its id on that platform,
            // so re-imports can match a renamed item instead of duplicating it.
            $table->string('source', 30)->nullable()->after('gramaj');
            $table->string('external_id', 64)->nullable()->after('source');
            $table->index(['source', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['source', 'external_id']);
            $table->dropColumn(['gramaj', 'source', 'external_id']);
        });
    }
};
