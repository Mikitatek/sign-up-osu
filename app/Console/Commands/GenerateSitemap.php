<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Sitemap\Sitemap;
use Spatie\Sitemap\Tags\Url;

class GenerateSitemap extends Command
{
    protected $signature = 'sitemap:generate';

    protected $description = 'Generează sitemap-ul site-ului';

    public function handle()
    {
        $sitemap = Sitemap::create()
            ->add(Url::create('/')
                ->setLastModificationDate(now())
                ->setPriority(1.0)
                ->setChangeFrequency(Url::CHANGE_FREQUENCY_DAILY))
            ->add(Url::create('/magazin')
                ->setPriority(0.9))
            ->add(Url::create('/contact')
                ->setPriority(0.8))
            ->add(Url::create('/termeni-si-conditii')
                ->setPriority(0.5))
            ->add(Url::create('/valori-nutritionale')
                ->setPriority(0.6));

        $sitemap->writeToFile(public_path('sitemap.xml'));

        $this->info('Sitemap generat cu succes!');
    }
}
