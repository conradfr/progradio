<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ListeningSession;
use App\Entity\Radio;
use App\Entity\Stream;
use App\Entity\User;
use App\Service\DateUtils;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Security;
use Doctrine\ORM\Query\ResultSetMapping;

class ListeningSessionRepository extends ServiceEntityRepository
{
    private $security;

    public function __construct(Security $security, ManagerRegistry $registry)
    {
        parent::__construct($registry, Radio::class);

        // Avoid calling getUser() in the constructor: auth may not
        // be complete yet. Instead, store the entire Security object.
        $this->security = $security;
    }

    public function getRadiosData($startDate, $endDate=null): array
    {
        $qb = $this->getEntityManager()->createQueryBuilder();

        $qb->select('r.id, r.codeName, r.name, c.id as c_id, c.codeName as c_codeName,'
                . 'COALESCE(SUM(EXTRACT(ls.dateTimeEnd, ls.dateTimeStart)), 0) as total_seconds, COALESCE(COUNT(DISTINCT ls.id), 0) as total_sessions')
            ->from(Radio::class, 'r')
            ->innerJoin('r.collection', 'c')
            ->leftJoin('r.streams', 'rs')
            ->leftJoin('rs.listeningSessions', 'ls')
            ->groupBy('r.id, c.id')
            ->addOrderBy('total_seconds', 'DESC');

        $this->addDates($qb, $startDate, $endDate);

        return $qb->getQuery()->getResult();
    }

    public function getPerDeviceData($startDate, $endDate=null, $type='radio'): array
    {
        $qb = $this->getEntityManager()->createQueryBuilder();

        $qb->select('ls.source,'
            . 'COALESCE(SUM(EXTRACT(ls.dateTimeEnd, ls.dateTimeStart)), 0) as total_seconds, COALESCE(COUNT(DISTINCT ls.id), 0) as total_sessions')
            ->from(ListeningSession::class, 'ls')
            ->groupBy('ls.source')
            ->addOrderBy('total_seconds', 'DESC');

        $this->addDates($qb, $startDate, $endDate);

        $qb->andWhere('ls.source IS NOT NULL');

        if ($type === 'radio') {
            $qb->andWhere('ls.stream IS NULL');
        } else {
            $qb->andWhere('ls.radioStream IS NULL');
        }

        $result = $qb->getQuery()->getResult();

        return array_column($result, null, 'source');
    }

    public function getStreamsData($startDate, $endDate=null): array
    {
        $qb = $this->getEntityManager()->createQueryBuilder();

        $qb->select('s.id, s.name, s.img, r.codeName as radio_code_name,'
            . 'COALESCE(SUM(EXTRACT(ls.dateTimeEnd, ls.dateTimeStart)), 0) as total_seconds, COALESCE(COUNT(DISTINCT ls.id), 0) as total_sessions')
            ->from(Stream::class, 's')
            ->leftJoin('s.radioStream', 'rs')
            ->leftJoin('rs.radio', 'r')
            ->leftJoin('s.listeningSessions', 'ls')
            ->groupBy('s.id, r.codeName')
            ->addOrderBy('total_seconds', 'DESC');

        $this->addDates($qb, $startDate, $endDate);

        return $qb->getQuery()->getResult();
    }

    protected function addDates(QueryBuilder $qb, \DateTime $startDate, \DateTime $endDate=null): void
    {
        if ($endDate === null) {
            $qb->where('DATE(AT_TIME_ZONE(AT_TIME_ZONE(ls.dateTimeStart, \'UTC\'), \'Europe/Paris\')) = DATE(:startDate)');
            $qb->setParameter('startDate', $startDate);
        } else {
            $qb->where('(DATE(AT_TIME_ZONE(AT_TIME_ZONE(ls.dateTimeStart, \'UTC\'), \'Europe/Paris\')) >= DATE(:startDate)'
                . ' AND DATE(AT_TIME_ZONE(AT_TIME_ZONE(ls.dateTimeStart, \'UTC\'), \'Europe/Paris\')) <= DATE(:endDate))');

            $qb->setParameters([
                'startDate' => $startDate,
                'endDate'=> $endDate
            ]);
        }
    }

    public function getCurrentWeb()
    {
        $baseResults = [
            'seo' => [
                'total_radios' => 0,
                'total_streams' => 0,
                'list_radios' => [],
                'list_streams' => []
            ],
            'web' => [
                'total_radios' => 0,
                'total_streams' => 0,
                'list_radios' => [],
                'list_streams' => []
            ]
        ];

        $sql = "
            select ls.source,
                    COALESCE(SUM(CASE WHEN ls.code_name is not null THEN 1 ELSE 0 END), 0) as total_radios,
                    COALESCE(SUM(CASE WHEN ls.stream_id is not null THEN 1 ELSE 0 END), 0) as total_streams,
                    COALESCE(json_agg(json_build_object('radio', ls.code_name, 'total', ls.total_radios))
                        FILTER (WHERE ls.code_name IS NOT NULL), '[]') as list_radios,
                    COALESCE(json_agg(json_build_object('stream', ls.stream_id, 'total', ls.total_streams))
                        FILTER (WHERE ls.stream_id IS NOT NULL), '[]') as list_streams
            FROM (
                    select ls.source, r.code_name, count(r.id) as total_radios, s.id as stream_id, count(s.id) as total_streams
                    from listening_session ls
                    left join radio_stream rs on ls.radio_stream_id = rs.id
                    left join radio r on rs.radio_id = r.id
                    left join stream s on ls.stream_id = s.id
                     WHERE ls.date_time_end > (now() at time zone 'utc' - interval '31 second')
                       AND ls.source IN (:source1, :source2)
                     GROUP BY ls.source, r.code_name, s.id
            ) ls
            GROUP BY ls.source
        ";

        $rsm = new ResultSetMapping();
        $rsm->addScalarResult('total_radios', 'total_radios', 'integer')
            ->addScalarResult('total_streams', 'total_streams', 'integer')
            ->addScalarResult('list_radios', 'list_radios', 'string')
            ->addScalarResult('list_streams', 'list_streams', 'string')
            ->addScalarResult('source', 'source', 'string');

        $query = $this->getEntityManager()->createNativeQuery($sql, $rsm);
        $query->setParameters([
            'source1' => ListeningSession::SOURCE_WEB,
            'source2' => ListeningSession::SOURCE_SEO
        ]);
        $query->disableResultCache();

        $result = $query->getResult();
        $resultIndexed = array_merge($baseResults, array_column($result, null, 'source'));

        foreach ($resultIndexed as &$row) {
            $jsonRadios = is_array($row['list_radios']) ? $row['list_radios'] : json_decode($row['list_radios']);
            $jsonStreams = is_array($row['list_streams']) ? $row['list_streams'] : json_decode($row['list_streams']);
            $row['list_radios'] =  array_column($jsonRadios, 'total', 'radio');
            $row['list_streams'] = array_column($jsonStreams, 'total', 'stream');
        }

        return $resultIndexed;
    }
}
