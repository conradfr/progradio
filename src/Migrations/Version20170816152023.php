<?php

namespace DoctrineMigrations;

use Symfony\Component\DependencyInjection\ContainerAwareInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Doctrine\Migrations\AbstractMigration;
use Doctrine\DBAL\Schema\Schema;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
class Version20170816152023 extends AbstractMigration implements ContainerAwareInterface
{
    private $container;

    public function setContainer(ContainerInterface $container = null)
    {
        $this->container = $container;
    }

    /**
     * @param Schema $schema
     */
    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs

    }

    /**
     * @param Schema $schema
     */
    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs

    }

    public function postUp(Schema $schema): void
    {
        $connection = $this->container->get('doctrine.orm.entity_manager')->getConnection();

        // RADIOS

        $radios = [
            [
                'codename' => 'rfm',
                'name' => 'RFM',
                'category' => 2,
                'share' => 3.2
            ],
            [
                'codename' => 'virgin',
                'name' => 'Virgin Radio',
                'category' => 2,
                'share' => 2.7
            ]
        ];

        for ($i=0;$i<count($radios);$i++) {
            $connection->exec(
                'INSERT INTO radio (id, category_id, code_name, name, share) VALUES ('
                .($i+11).','.$radios[$i]['category'].",'".$radios[$i]['codename']."','".$radios[$i]['name']."',".$radios[$i]['share'].");"
            );
        }
    }
}
