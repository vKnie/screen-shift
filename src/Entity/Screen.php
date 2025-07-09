<?php
namespace App\Entity;

use App\Repository\ScreenRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScreenRepository::class)]
class Screen
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\ManyToOne(inversedBy: 'screens')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Group $groupeScreen = null;

    /**
     * @var Collection<int, Picture>
     */
    #[ORM\ManyToMany(targetEntity: Picture::class, mappedBy: 'screens')]
    private Collection $pictures;

    public function __construct()
    {
        $this->pictures = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getGroupeScreen(): ?Group
    {
        return $this->groupeScreen;
    }

    public function setGroupeScreen(?Group $groupeScreen): static
    {
        $this->groupeScreen = $groupeScreen;
        return $this;
    }

    /**
     * @return Collection<int, Picture>
     */
    public function getPictures(): Collection
    {
        return $this->pictures;
    }

    public function addPicture(Picture $picture): static
    {
        if (!$this->pictures->contains($picture)) {
            $this->pictures->add($picture);
            $picture->addScreen($this);
        }

        return $this;
    }

    public function removePicture(Picture $picture): static
    {
        if ($this->pictures->removeElement($picture)) {
            $picture->removeScreen($this);
        }

        return $this;
    }
}