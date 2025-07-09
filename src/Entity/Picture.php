<?php
namespace App\Entity;

use App\Repository\PictureRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: PictureRepository::class)]
#[Vich\Uploadable]
class Picture
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?int $delay = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTime $startDate = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTime $endDate = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $backgroundColor = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $position = null;

    // Nouvelle relation Many-to-Many avec Screen
    #[ORM\ManyToMany(targetEntity: Screen::class, inversedBy: 'pictures')]
    #[ORM\JoinTable(name: 'picture_screen')]
    private Collection $screens;

    #[Vich\UploadableField(mapping: 'picture_image', fileNameProperty: 'imageName')]
    private ?File $imageFile = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $imageName = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $updatedAt = null;

    public function __construct()
    {
        $this->screens = new ArrayCollection();
    }

    // Getters & Setters existants
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDelay(): ?int
    {
        return $this->delay;
    }

    public function setDelay(int $delay): static
    {
        $this->delay = $delay;
        return $this;
    }

    public function getStartDate(): ?\DateTime
    {
        return $this->startDate;
    }

    public function setStartDate(?\DateTime $startDate): static
    {
        $this->startDate = $startDate;
        return $this;
    }

    public function getEndDate(): ?\DateTime
    {
        return $this->endDate;
    }

    public function setEndDate(?\DateTime $endDate): static
    {
        $this->endDate = $endDate;
        return $this;
    }

    public function getBackgroundColor(): ?string
    {
        return $this->backgroundColor;
    }

    public function setBackgroundColor(?string $backgroundColor): static
    {
        $this->backgroundColor = $backgroundColor;
        return $this;
    }

    public function getPosition(): ?int
    {
        return $this->position;
    }

    public function setPosition(?int $position): static
    {
        $this->position = $position;
        return $this;
    }

    // Nouvelles méthodes pour gérer la collection de screens
    /**
     * @return Collection<int, Screen>
     */
    public function getScreens(): Collection
    {
        return $this->screens;
    }

    public function addScreen(Screen $screen): static
    {
        if (!$this->screens->contains($screen)) {
            $this->screens->add($screen);
        }

        return $this;
    }

    public function removeScreen(Screen $screen): static
    {
        $this->screens->removeElement($screen);

        return $this;
    }

    // Méthodes de compatibilité (pour ne pas casser le code existant)
    public function getScreenPicture(): ?Screen
    {
        return $this->screens->first() ?: null;
    }

    public function setScreenPicture(?Screen $screenPicture): static
    {
        $this->screens->clear();
        if ($screenPicture !== null) {
            $this->addScreen($screenPicture);
        }
        return $this;
    }

    // Méthodes pour l'upload d'image
    public function getImageFile(): ?File
    {
        return $this->imageFile;
    }

    public function setImageFile(?File $imageFile): static
    {
        $this->imageFile = $imageFile;
        if ($imageFile !== null) {
            $this->updatedAt = new \DateTimeImmutable();
        }
        return $this;
    }

    public function getImageName(): ?string
    {
        return $this->imageName;
    }

    public function setImageName(?string $imageName): static
    {
        $this->imageName = $imageName;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(?\DateTimeInterface $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }
}